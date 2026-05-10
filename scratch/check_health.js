async function checkHealth() {
  try {
    const res = await fetch("http://localhost:5000/api/health");
    const data = await res.json();
    console.log("Health Check:", JSON.stringify(data, null, 2));
    if (data.version === "1.0.1-flexible-search") {
      console.log("SUCCESS: Backend is using the new code.");
    } else {
      console.log("FAILURE: Backend is still using OLD code. PLEASE RESTART.");
    }
  } catch (err) {
    console.log("Error connecting to port 5000:", err.message);
  }
}
checkHealth();
