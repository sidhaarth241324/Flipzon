// -------------------------
// Get user info
// -------------------------
const name = sessionStorage.getItem("displayName") || "Guest";
const email = sessionStorage.getItem("email") || "guest@example.com";
const role = sessionStorage.getItem("role") || "user";

// Safe email for Firestore (if needed)
const emailSafe = email.replace(/\./g, "_").replace(/@/g, "_");
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

// Display user info
document.getElementById("userDetails").innerHTML = `
  <p><strong>Name:</strong> ${name}</p>
  <p><strong>Email:</strong> ${email}</p>
  <p><strong>Role:</strong> ${role}</p>
`;

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  sessionStorage.clear();
  window.location.href = "index.html";
});

// -------------------------
// Global variables
// -------------------------
let allProducts = [];
let currentPage = 1;
const perPage = 6;

// -------------------------
// Fetch products from Firestore
// -------------------------
async function fetchProducts() {
  try {
    const res = await fetch(
      "https://firestore.googleapis.com/v1/projects/flipzon-69df3/databases/(default)/documents/Products"
    );
    const data = await res.json();

    allProducts = (data.documents || []).map(doc => ({
      id: doc.name.split("/").pop(),
      name: doc.fields.name.stringValue,
      price: parseInt(doc.fields.price.integerValue),
      desc: doc.fields.description?.stringValue || "No details",
      category: doc.fields.category?.stringValue || "Others",
      image: doc.fields.image?.stringValue || "https://via.placeholder.com/150"
    }));

    renderProducts();
  } catch (err) {
    console.error("Fetch Products Error:", err);
    document.getElementById("products").innerText = "Failed to load products.";
  }
}

// -------------------------
// Render products with search, filter, pagination
// -------------------------
function renderProducts() {
  const searchVal = document.getElementById("searchBox").value.toLowerCase();
  const categoryVal = document.getElementById("categoryFilter").value;

  let filtered = allProducts.filter(p =>
    p.name.toLowerCase().includes(searchVal) &&
    (categoryVal === "All" || p.category === categoryVal)
  );

  const start = (currentPage - 1) * perPage;
  const paginated = filtered.slice(start, start + perPage);

  const productsDiv = document.getElementById("products");
  productsDiv.innerHTML = "";

  paginated.forEach(p => {
    const div = document.createElement("div");
    div.className = "product";
    div.innerHTML = `
      <img src="${p.image}" alt="${p.name}" style="width:150px;height:150px;object-fit:cover;">
      <h3>${p.name}</h3>
      <p>₹${p.price}</p>
      <p>${p.desc}</p>
      <p><em>${p.category}</em></p>
    `;

    if(role === "user") {
      // User: Add to cart with quantity
      let qty = 1;
      const qtyDiv = document.createElement("div");
      const minus = document.createElement("button");
      const plus = document.createElement("button");
      const span = document.createElement("span");

      minus.textContent = "-";
      plus.textContent = "+";
      span.textContent = qty;
      span.style.margin = "0 10px";

      minus.addEventListener("click", () => { if(qty>1) qty--; span.textContent = qty; });
      plus.addEventListener("click", () => { qty++; span.textContent = qty; });

      qtyDiv.append(minus, span, plus);
      div.appendChild(qtyDiv);

      const addBtn = document.createElement("button");
      addBtn.textContent = "Add to Cart";
      addBtn.addEventListener("click", () => addToCart({
        id: p.id,
        name: p.name,
        price: p.price,
        qty,
        image: p.image,
        category: p.category
      }));
      div.appendChild(addBtn);

    } else if(role === "admin") {
      // Admin: Edit
      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️ Edit";
      editBtn.addEventListener("click", () => showEditProductForm(p));
      div.appendChild(editBtn);

      // Admin: Delete
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "🗑️ Delete";
      deleteBtn.addEventListener("click", () => deleteProduct(p.id));
      div.appendChild(deleteBtn);
    }

    productsDiv.appendChild(div);
  });

  renderPagination(filtered.length);
}

// -------------------------
// Pagination
// -------------------------
function renderPagination(total) {
  const pages = Math.ceil(total / perPage);
  const pagDiv = document.getElementById("pagination");
  pagDiv.innerHTML = "";

  for (let i = 1; i <= pages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = (i === currentPage) ? "active" : "";
    btn.addEventListener("click", () => { currentPage = i; renderProducts(); });
    pagDiv.appendChild(btn);
  }
}

// -------------------------
// Search & filter
// -------------------------
document.getElementById("searchBox").addEventListener("input", () => { currentPage=1; renderProducts(); });
document.getElementById("categoryFilter").addEventListener("change", () => { currentPage=1; renderProducts(); });

// -------------------------
// Add to Cart (User only)
// -------------------------
async function addToCart(product) {
  try {
    const res = await fetch("https://firestore.googleapis.com/v1/projects/flipzon-69df3/databases/(default)/documents/Cart");
    const data = await res.json();
    const docs = data.documents || [];

    const existing = docs.find(doc => doc.fields?.id?.stringValue === product.id);

    if(existing) {
      const docId = existing.name.split("/").pop();
      const oldQty = parseInt(existing.fields.qty.integerValue) || 0;
      const newQty = oldQty + product.qty;

      await fetch(`https://firestore.googleapis.com/v1/projects/flipzon-69df3/databases/(default)/documents/Cart/${docId}`, {
        method:"PATCH",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
          fields: {
            id: { stringValue: product.id },
            name: { stringValue: product.name },
            price: { integerValue: product.price },
            qty: { integerValue: newQty },
            category: { stringValue: product.category || "Others" },
            image: { stringValue: product.image || "https://via.placeholder.com/150" }
          }
        })
      });
    } else {
      await fetch("https://firestore.googleapis.com/v1/projects/flipzon-69df3/databases/(default)/documents/Cart", {
        method:"POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
          fields: {
            id: { stringValue: product.id },
            name: { stringValue: product.name },
            price: { integerValue: product.price },
            qty: { integerValue: product.qty },
            category: { stringValue: product.category || "Others" },
            image: { stringValue: product.image || "https://via.placeholder.com/150" }
          }
        })
      });
    }

    showToast(`${product.name} added to cart!`);
  } catch(err) {
    console.error("Add to Cart Error:", err);
    showToast("Failed to add to cart.");
  }
}

// -------------------------
// Admin: Add Product
// -------------------------
if(role === "admin") {
  document.getElementById("adminControls").style.display = "block";

  const addBtn = document.getElementById("addProductBtn");
  const addForm = document.getElementById("addProductForm");
  addForm.style.display = "none";

  addBtn.addEventListener("click", () => {
    addForm.style.display = "block";
  });

  document.getElementById("cancelBtn").addEventListener("click", () => {
    addForm.reset();
    addForm.style.display = "none";
  });

  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("productName").value.trim();
    const price = parseInt(document.getElementById("productPrice").value);
    const category = document.getElementById("productCategory").value.trim() || "Others";
    const desc = document.getElementById("productDesc").value.trim() || "No details";
    const image = document.getElementById("productImage").value.trim() || "https://via.placeholder.com/150";
    const qty = parseInt(document.getElementById("productQty").value) || 1;

    if(!name || !price) return showToast("Enter name and price.");

    const productData = {
      fields: {
        name: { stringValue: name },
        price: { integerValue: price },
        category: { stringValue: category },
        description: { stringValue: desc },
        image: { stringValue: image },
        qty: { integerValue: qty }
      }
    };

    try {
      await fetch("https://firestore.googleapis.com/v1/projects/flipzon-69df3/databases/(default)/documents/Products", {
        method:"POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify(productData)
      });

      showToast("Product added!");
      addForm.reset();
      addForm.style.display = "none";
      fetchProducts();
    } catch(err) {
      console.error("Add Product Error:", err);
      showToast("Failed to add product.");
    }
  });
}

// -------------------------
// Admin: Edit Product
function showEditProductForm(product) {
  const form = document.getElementById("addProductForm");
  const addBtn = document.getElementById("addProductBtn");

  document.getElementById("productName").value = product.name;
  document.getElementById("productPrice").value = product.price;
  document.getElementById("productCategory").value = product.category;
  document.getElementById("productDesc").value = product.desc;
  document.getElementById("productImage").value = product.image || "";
  document.getElementById("productQty").value = product.qty || 1;

  form.style.display = "block";
  addBtn.style.display = "none";

  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);

  newForm.querySelector("#cancelBtn").addEventListener("click", () => {
    newForm.reset();
    newForm.style.display = "none";
    addBtn.style.display = "inline-block";
  });

  newForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("productName").value.trim();
    const price = parseInt(document.getElementById("productPrice").value);
    const category = document.getElementById("productCategory").value.trim() || "Others";
    const desc = document.getElementById("productDesc").value.trim() || "No details";
    const image = document.getElementById("productImage").value.trim() || "https://via.placeholder.com/150";
    const qty = parseInt(document.getElementById("productQty").value) || 1;

    if(!name || !price) return showToast("Enter name and price");

    try {
      await fetch(`https://firestore.googleapis.com/v1/projects/flipzon-69df3/databases/(default)/documents/Products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            name: { stringValue: name },
            price: { integerValue: price },
            category: { stringValue: category },
            description: { stringValue: desc },
            image: { stringValue: image },
            qty: { integerValue: qty }
          }
        })
      });

      showToast("✅ Product updated successfully!");
      newForm.reset();
      newForm.style.display = "none";
      addBtn.style.display = "inline-block";
      fetchProducts();
    } catch (err) {
      console.error("Update Product Error:", err);
      showToast("Failed to update product.");
    }
  });
}

// -------------------------
// Admin: Delete Product
// -------------------------
async function deleteProduct(id) {
  if(!confirm("Are you sure to delete this product?")) return;
  try {
    await fetch(`https://firestore.googleapis.com/v1/projects/flipzon-69df3/databases/(default)/documents/Products/${id}`, { method:"DELETE" });
    showToast("Product deleted!");
    fetchProducts();
  } catch(err) {
    console.error("Delete Product Error:", err);
    showToast("Failed to delete product.");
  }
}

// -------------------------
// Initialize
// -------------------------
fetchProducts();
