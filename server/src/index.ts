import { config } from "./config";
import { createApp } from "./app";

createApp().listen(config.port, () => {
  console.log(`QR redirect server listening on :${config.port}`);
  console.log(`Public base URL: ${config.publicBaseUrl}`);
});
