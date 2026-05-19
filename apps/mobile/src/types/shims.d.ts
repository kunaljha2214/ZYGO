declare module 'react-native-config' {
  export interface NativeConfig {
    API_BASE_URL?: string;
    GOOGLE_MAPS_API_KEY?: string;
  }
  const Config: NativeConfig;
  export default Config;
}
