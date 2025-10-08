/**
 * @file Provides a reusable form validation utility.
 * @description This class can be instantiated for a specific form to validate its fields
 * based on a predefined set of rules.
 */
class FormValidator {
  /**
   * @param {HTMLFormElement} form - The form element to be validated.
   */
  constructor(form) {
    this.form = form;
    this.rules = {
      // 'name' attribute: { regex, message }
      nombre_completo: {
        regex: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{3,50}$/,
        message: 'Full name must contain only letters and spaces (minimum 3 characters).',
      },
      telefono: {
        regex: /^\d{10}$/,
        message: 'Phone number must contain 10 digits.',
      },
      correo: {
        regex: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/,
        message: 'Please enter a valid email address.',
      },
      fecha_inicio: {
        validator: (value) => value.trim() !== '',
        message: 'The start date is required.',
      },
      metodo_pago: {
        validator: (value) => value.trim() !== '',
        message: 'You must select a payment method.',
      },
      id_tipo_membresia: {
        validator: (value) => value.trim() !== '',
        message: 'You must select a membership type.',
      },
    };
  }

  /**
   * Clears all previous error messages and styles from the form.
   */
  clearErrors() {
    this.form.querySelectorAll('.error-message').forEach(el => el.classList.add('hidden'));
    this.form.querySelectorAll('input, select').forEach(el => el.classList.remove('border-red-500'));
  }

  /**
   * Displays an error message for a specific input field.
   * @param {HTMLInputElement|HTMLSelectElement} input - The input element with the error.
   * @param {string} message - The error message to display.
   */
  showError(input, message) {
    const errorContainer = input.nextElementSibling;
    if (errorContainer && errorContainer.classList.contains('error-message')) {
      errorContainer.textContent = message;
      errorContainer.classList.remove('hidden');
      input.classList.add('border-red-500');
    }
  }

  /**
   * Validates the entire form based on the predefined rules.
   * @returns {boolean} - True if the form is valid, otherwise false.
   */
  validate() {
    this.clearErrors();
    let isFormValid = true;

    for (const fieldName in this.rules) {
      const input = this.form.querySelector(`[name="${fieldName}"]`);
      if (!input || !input.required) continue; // Skip non-existent or non-required fields

      const rule = this.rules[fieldName];
      const value = input.value.trim();
      let isFieldValid = false;

      if (rule.validator) {
        isFieldValid = rule.validator(value);
      } else if (rule.regex) {
        isFieldValid = rule.regex.test(value);
      }

      if (!isFieldValid) {
        this.showError(input, rule.message);
        isFormValid = false;
      }
    }
    return isFormValid;
  }
}