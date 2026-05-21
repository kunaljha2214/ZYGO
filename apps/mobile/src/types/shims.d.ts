declare module 'react-native-config' {
  export interface NativeConfig {
    API_BASE_URL?: string;
    MAPBOX_ACCESS_TOKEN?: string;
    MAPBOX_STYLE_ID?: string;
  }
  const Config: NativeConfig;
  export default Config;
}
