const { initLogger, Log } = require("./index");

async function runTest() {
  initLogger({
    email: "omjee1364.be23@chitkarauniversity.edu.in",
    name: "omjee kumar",
    rollNo: "2311981364",
    accessCode: "EXfvDp",
    clientID: "f24463c7-05a7-4055-92ca-ea6bebcde44e",
    clientSecret: "XSVNpPaHPuYCacJx",
  });

  try {
    const r1 = await Log("backend", "info", "config", "Logger smoke test from backend");
    console.log("Backend log:", r1);

    const r2 = await Log("frontend", "debug", "component", "Logger smoke test from frontend");
    console.log("Frontend log:", r2);

    const r3 = await Log("backend", "error", "handler", "received string, expected bool");
    console.log("Error log:", r3);

    const r4 = await Log("backend", "fatal", "db", "Critical database connection failure.");
    console.log("Fatal log:", r4);

    console.log("\n--- All smoke tests passed ---");
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

runTest();
