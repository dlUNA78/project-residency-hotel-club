/**
 * @file Manages the dynamic members section on the edit membership page.
 * @description This class handles adding and removing member input fields for family memberships
 * and ensures the input names are correctly indexed for form submission.
 */
class EditMembershipManager {
  /**
   * Initializes the manager by caching DOM elements and binding events.
   */
  constructor() {
    this.membersContainer = document.getElementById("membersContainer");
    this.addMemberButton = document.getElementById("addMemberButton");
    this.memberTemplate = document.getElementById("member-template");

    if (!this.membersContainer || !this.addMemberButton || !this.memberTemplate) {
      // If elements are not present (e.g., for non-family memberships), do not proceed.
      return;
    }

    this.bindEvents();
  }

  /**
   * Attaches event listeners to the 'Add Member' button and existing 'Remove' buttons.
   */
  bindEvents() {
    this.addMemberButton.addEventListener("click", () => this.addMember());

    // Attach event listeners to already existing remove buttons.
    this.membersContainer.querySelectorAll(".remove-member-button").forEach((button) => {
      button.addEventListener("click", (event) => {
        this.removeMember(event.target);
      });
    });
  }

  /**
   * Adds a new member input field to the form.
   * It clones a template, updates its input names with the correct index,
   * and attaches a 'remove' event listener.
   */
  addMember() {
    const newMemberIndex = this.membersContainer.querySelectorAll(".member-item").length;
    const clone = this.memberTemplate.content.cloneNode(true);

    // Update the name attribute of the input to ensure correct form submission.
    const input = clone.querySelector('[name*="__INDEX__"]');
    if (input) {
      input.name = input.name.replace('__INDEX__', newMemberIndex);
    }

    // Add event listener to the new remove button.
    const removeButton = clone.querySelector(".remove-member-button");
    if (removeButton) {
      removeButton.addEventListener("click", (event) => {
        this.removeMember(event.target);
      });
    }

    this.membersContainer.appendChild(clone);
  }

  /**
   * Removes a member's input field group from the DOM.
   * @param {HTMLElement} element - The remove button that was clicked.
   */
  removeMember(element) {
      const memberItem = element.closest(".member-item");
      if(memberItem) {
          memberItem.remove();
          // After removing an item, re-index all remaining members to ensure the array is sequential.
          this.updateMemberIndexes();
      }
  }

  /**
   * Updates the array index in the 'name' attribute of all member inputs.
   * This is crucial to prevent gaps in the array sent to the server (e.g., members[0], members[2]).
   */
  updateMemberIndexes() {
    this.membersContainer.querySelectorAll(".member-item").forEach((item, index) => {
      const input = item.querySelector("input[name^='members']");
      if (input) {
        // Replace the number within the brackets, e.g., members[1] -> members[0].
        input.name = input.name.replace(/\[\d+\]/, `[${index}]`);
      }

      const hiddenInput = item.querySelector("input[type='hidden']");
      if (hiddenInput) {
          hiddenInput.name = hiddenInput.name.replace(/\[\d+\]/, `[${index}]`);
      }
    });
  }
}

// Initialize the manager once the DOM is fully loaded.
document.addEventListener("DOMContentLoaded", () => {
  new EditMembershipManager();
});