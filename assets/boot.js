"use strict";

try {
  if (!sessionStorage.getItem("volparia_intro")) {
    document.documentElement.classList.add("intro-pending");
    sessionStorage.setItem("volparia_intro", "1");
  }
} catch {
  // Depolama kapalıysa mağaza normal biçimde açılmaya devam eder.
}
