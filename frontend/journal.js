async function loadJournalEntries() {
  const container = document.getElementById("journalContainer");
  container.innerHTML = "<p class='loading'>Loading...</p>";

  try {
    const response = await fetch("http://127.0.0.1:5000/journal");
    const data = await response.json();

    if (data.error) {
      container.innerHTML = `<p class='error'>Error: ${data.error}</p>`;
      return;
    }

    if (data.length === 0) {
      container.innerHTML = "<p>No journal entries found yet.</p>";
      return;
    }

    container.innerHTML = ""; // clear loading text

    data.forEach((entry) => {
      const entryDiv = document.createElement("div");
      entryDiv.classList.add("journal-entry");

      const sharedTag = entry.shared
        ? `<span class="shared">Shared</span>`
        : "";

      entryDiv.innerHTML = `
        <button class="delete-btn" data-id="${entry.id}">&times;</button>
        <div class="journal-header">
          <p class="date">${new Date(entry.date).toLocaleString()}</p>
          <span class="tag ${entry.mood.toLowerCase()}">${entry.mood}</span>
          ${sharedTag}
        </div>
        <p class="summary">${entry.summary || "No summary available."}</p>
        <button class="details-btn" data-id="${entry.id}">View Details</button>
      `;

      container.appendChild(entryDiv);
    });

    // Attach delete button functionality
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const chatId = e.target.getAttribute("data-id");
        const confirmDelete = confirm("Are you sure you want to delete this journal entry?");
        if (confirmDelete) {
          await deleteJournalEntry(chatId);
          e.target.parentElement.remove(); // remove from DOM
        }
      });
    });

    // Attach "View Details" listeners
    document.querySelectorAll(".details-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const chatId = e.target.getAttribute("data-id");
        alert(`Feature coming soon! (View full chat #${chatId})`);
      });
    });
  } catch (err) {
    container.innerHTML = `<p class='error'>⚠️ Failed to load journal entries.</p>`;
    console.error(err);
  }
}

// --- Delete journal entry ---
async function deleteJournalEntry(chatId) {
  try {
    const response = await fetch(`http://127.0.0.1:5000/journal/${chatId}`, {
      method: "DELETE",
    });

    const data = await response.json();
    if (data.error) {
      alert("❌ " + data.error);
    } else {
      console.log("🗑️", data.message);
    }
  } catch (err) {
    console.error("Error deleting journal:", err);
    alert("⚠️ Failed to delete entry.");
  }
}

window.addEventListener("DOMContentLoaded", loadJournalEntries);
