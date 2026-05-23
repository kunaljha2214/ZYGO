import { Platform, PermissionsAndroid } from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  type CameraOptions,
  type ImageLibraryOptions,
} from 'react-native-image-picker';
import { AppAlert } from '../alert';

export type PickedImage = {
  dataUrl: string;
  fileName: string;
  uri: string;
};

const pickerOptions: ImageLibraryOptions & CameraOptions = {
  mediaType: 'photo',
  includeBase64: true,
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.85,
  selectionLimit: 1,
};

async function ensureAndroidMediaPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const perms: string[] = [PermissionsAndroid.PERMISSIONS.CAMERA];
  if (Number(Platform.Version) >= 33) {
    perms.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
  } else {
    perms.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
  }
  const results = await PermissionsAndroid.requestMultiple(perms);
  const denied = perms.filter((p) => results[p] !== PermissionsAndroid.RESULTS.GRANTED);
  if (denied.length > 0) {
    AppAlert.alert(
      'Permission needed',
      'Allow camera and photos access in Settings to upload images.'
    );
    return false;
  }
  return true;
}

function assetToPicked(asset: {
  base64?: string | null;
  type?: string | null;
  fileName?: string | null;
  uri?: string | null;
}): PickedImage | null {
  if (!asset.base64) {
    AppAlert.alert('Upload', 'Could not read the selected image. Try another photo.');
    return null;
  }
  const mime = asset.type?.startsWith('image/') ? asset.type : 'image/jpeg';
  const fileName = asset.fileName?.trim() || `photo-${Date.now()}.jpg`;
  const uri = asset.uri ?? '';
  return {
    dataUrl: `data:${mime};base64,${asset.base64}`,
    fileName,
    uri,
  };
}

export async function pickImageFromCamera(): Promise<PickedImage | null> {
  if (!(await ensureAndroidMediaPermissions())) return null;
  const result = await launchCamera(pickerOptions);
  if (result.didCancel || !result.assets?.[0]) return null;
  return assetToPicked(result.assets[0]);
}

export async function pickImageFromGallery(): Promise<PickedImage | null> {
  if (!(await ensureAndroidMediaPermissions())) return null;
  const result = await launchImageLibrary(pickerOptions);
  if (result.didCancel || !result.assets?.[0]) return null;
  return assetToPicked(result.assets[0]);
}

/** Wait for the styled alert to close before opening camera/gallery. */
function openPickerAfterUiSettled(run: () => Promise<PickedImage | null>): Promise<PickedImage | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      void run().then(resolve);
    }, 500);
  });
}

/**
 * Camera vs gallery chooser — same purple AppAlert as profile upload.
 */
export function pickImageWithChoice(): Promise<PickedImage | null> {
  return new Promise((resolve) => {
    let settled = false;
    let launchingPicker = false;

    const finish = (value: PickedImage | null) => {
      if (settled) return;
      settled = true;
      launchingPicker = false;
      resolve(value);
    };

    const startCamera = () => {
      launchingPicker = true;
      void openPickerAfterUiSettled(pickImageFromCamera).then(finish);
    };

    const startGallery = () => {
      launchingPicker = true;
      void openPickerAfterUiSettled(pickImageFromGallery).then(finish);
    };

    AppAlert.alert(
      'Upload photo',
      'Take a new photo or choose one from your gallery',
      [
        { text: 'Take photo', onPress: startCamera },
        { text: 'Choose from gallery', onPress: startGallery },
        { text: 'Cancel', style: 'cancel', onPress: () => finish(null) },
      ],
      {
        onBackdrop: () => {
          if (!launchingPicker) finish(null);
        },
      }
    );
  });
}
