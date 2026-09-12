#!/usr/bin/env node
import { SecurityChallengeError, resolveShortlink } from "./index.js";

const input = process.argv[2];
if (!input) {
  console.error("Usage: npm run resolve -- <move2link-url>");
  process.exitCode = 2;
} else {
  try {
    const result = await resolveShortlink(input, { logger: console.error });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    if (error instanceof SecurityChallengeError) {
      console.error(`[shortlinx:move2link] BLOCKED: ${error.message} (HTTP ${error.status})`);
      process.exitCode = 3;
    } else {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
