// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  supabaseUrl: 'https://hhjuvqhvvsknjybbyeln.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoanV2cWh2dnNrbmp5YmJ5ZWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MTE5NjEsImV4cCI6MjA4MDQ4Nzk2MX0.1ZuA_GrIeNoFf6QqfKy93Nh55uwCvR3MQt23XcN4FxQ',
  /**
   * OSRM base URL for routing requests.
   * Use the public HTTPS endpoint by default to avoid dev-server HTML fallbacks and CORS.
   * If you configure a local proxy, you can switch this to '/osrm/route/v1/driving'.
   */
  osrmBaseUrl: 'https://router.project-osrm.org/route/v1/driving',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
