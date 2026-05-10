async function testSearch() {
  try {
    const source = "Delhi, India";
    const url = `http://localhost:5000/api/trips?source=${encodeURIComponent(source)}&priceMax=30000&seatsMin=1`;
    console.log("Testing URL (Port 5000):", url);
    
    const res = await fetch(url);
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Total found:", data.items ? data.items.length : 0);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testSearch();
