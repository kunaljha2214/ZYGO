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

/** Prompt to choose camera or gallery, then return base64 data URL for upload APIs. */
export function pickImageWithChoice(): Promise<PickedImage | null> {
  return new Promise((resolve) => {
    AppAlert.alert('Upload photo', 'Take a new photo or choose from gallery', [
      { text: 'Camera', onPress: () => void pickImageFromCamera().then(resolve) },
      { text: 'Gallery', onPress: () => void pickImageFromGallery().then(resolve) },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}
