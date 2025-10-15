function showToast(message, type = "info") {
  let bgColor = "#3498db"; // default blue
  if(type === "success") bgColor = "#2ecc71";
  else if(type === "error") bgColor = "#e74c3c";
  else if(type === "warning") bgColor = "#f1c40f";

  Toastify({
    text: message,
    duration: 3000,
    gravity: "top",
    position: "right",
    backgroundColor: bgColor,
    stopOnFocus: true
  }).showToast();
}
document.getElementById("order").addEventListener("click", () => {
  // Here you can also implement actual order logic if needed
  showToast(" Order placed successfully!", "success");

  // Optional: clear the cart after ordering
  document.getElementById("cartItems").innerHTML = "";
  document.getElementById("totalPrice").textContent = "0";
});



document.getElementById("clearCartBtn").addEventListener("click", async () => {
  if(!confirm("Are you sure you want to clear the cart?")) return;

  try {
    //  Fetch all cart items
    const res = await fetch("https://firestore.googleapis.com/v1/projects/flipzon-69df3/databases/(default)/documents/Cart");
    const data = await res.json();
    const docs = data.documents || [];

    if(docs.length === 0) {
      alert("Cart is already empty!");
      return;
    }

    // Delete all items concurrently
    await Promise.all(docs.map(doc => {
      const docId = doc.name.split("/").pop();
      return fetch(`https://firestore.googleapis.com/v1/projects/flipzon-69df3/databases/(default)/documents/Cart/${docId}`, {
        method: "DELETE"
      });
    }));

    // Clear cart UI
    document.getElementById("cartItems").innerHTML = "";
    document.getElementById("totalPrice").textContent = "0";

    alert("Cart cleared successfully!");
  } catch(err) {
    console.error("Clear Cart Error:", err);
    alert("Failed to clear cart.");
  }
});
