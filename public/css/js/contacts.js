// Contact management JavaScript
console.log('Contacts.js loaded');

document.addEventListener('DOMContentLoaded', function() {
    setupDeleteHandlers();
    setupFormValidation();
});

function setupDeleteHandlers() {
    const deleteButtons = document.querySelectorAll('.delete-btn');
    const deleteModal = document.getElementById('deleteModal');
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const contactToDeleteElement = document.getElementById('contactToDelete');
    
    let contactToDelete = null;
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent row click when clicking delete button
            
            const contactId = this.dataset.contactId;
            const contactName = this.dataset.contactName;
            
            contactToDelete = {
                id: contactId,
                name: contactName
            };
            
            if (contactToDeleteElement) {
                contactToDeleteElement.textContent = contactName;
            }
            
            // Show modal
            if (deleteModal) {
                const modal = new bootstrap.Modal(deleteModal);
                modal.show();
            } else {
                // Fallback to confirm dialog
                if (confirm(`Are you sure you want to delete ${contactName}?`)) {
                    deleteContact(contactId);
                }
            }
        });
    });
    
    // Handle confirm delete
    if (confirmDeleteBtn && deleteModal) {
        confirmDeleteBtn.addEventListener('click', function() {
            if (contactToDelete) {
                deleteContact(contactToDelete.id);
                
                // Hide modal
                const modal = bootstrap.Modal.getInstance(deleteModal);
                modal.hide();
            }
        });
    }
}

function deleteContact(contactId) {
    // Show loading state
    const deleteBtn = document.querySelector(`[data-contact-id="${contactId}"]`);
    if (deleteBtn) {
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }
    
    // Make delete request
    fetch(`/contacts/${contactId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        if (response.ok) {
            // Success - reload page to show updated list
            showSuccessMessage('Contact deleted successfully');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } else {
            throw new Error('Failed to delete contact');
        }
    })
    .catch(error => {
        console.error('Error deleting contact:', error);
        showErrorMessage('Failed to delete contact. Please try again.');
        
        // Restore button state
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        }
    });
}

function setupFormValidation() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!validateForm(this)) {
                e.preventDefault();
                return false;
            }
            
            // Show loading state on submit button
            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                const originalContent = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';
                
                // Restore button after 5 seconds if form hasn't been submitted
                setTimeout(() => {
                    if (!submitBtn.disabled) return;
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalContent;
                }, 5000);
            }
        });
        
        // Real-time validation
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                validateField(this);
            });
            
            input.addEventListener('input', function() {
                // Clear validation state on input
                this.classList.remove('is-valid', 'is-invalid');
                const feedback = this.parentNode.querySelector('.invalid-feedback');
                if (feedback) {
                    feedback.remove();
                }
            });
        });
    });
}

function validateForm(form) {
    let isValid = true;
    
    // Required field validation
    const requiredFields = form.querySelectorAll('[required]');
    requiredFields.forEach(field => {
        if (!validateField(field)) {
            isValid = false;
        }
    });
    
    // Email validation
    const emailFields = form.querySelectorAll('input[type="email"]');
    emailFields.forEach(field => {
        if (field.value && !isValidEmail(field.value)) {
            showFieldError(field, 'Please enter a valid email address');
            isValid = false;
        }
    });
    
    // Phone validation
    const phoneFields = form.querySelectorAll('input[type="tel"]');
    phoneFields.forEach(field => {
        if (field.value && !isValidPhone(field.value)) {
            showFieldError(field, 'Please enter a valid phone number');
            isValid = false;
        }
    });
    
    return isValid;
}

function validateField(field) {
    if (field.hasAttribute('required') && !field.value.trim()) {
        showFieldError(field, 'This field is required');
        return false;
    }
    
    if (field.type === 'email' && field.value && !isValidEmail(field.value)) {
        showFieldError(field, 'Please enter a valid email address');
        return false;
    }
    
    if (field.type === 'tel' && field.value && !isValidPhone(field.value)) {
        showFieldError(field, 'Please enter a valid phone number');
        return false;
    }
    
    // Field is valid
    field.classList.remove('is-invalid');
    field.classList.add('is-valid');
    const feedback = field.parentNode.querySelector('.invalid-feedback');
    if (feedback) {
        feedback.remove();
    }
    
    return true;
}

function showFieldError(field, message) {
    field.classList.remove('is-valid');
    field.classList.add('is-invalid');
    
    // Remove existing feedback
    const existingFeedback = field.parentNode.querySelector('.invalid-feedback');
    if (existingFeedback) {
        existingFeedback.remove();
    }
    
    // Add new feedback
    const feedback = document.createElement('div');
    feedback.className = 'invalid-feedback';
    feedback.textContent = message;
    field.parentNode.appendChild(feedback);
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    // Accept 10 or 11 digit numbers (with or without country code)
    return digits.length >= 10 && digits.length <= 11;
}

function showSuccessMessage(message) {
    showMessage(message, 'success');
}

function showErrorMessage(message) {
    showMessage(message, 'danger');
}

function showInfoMessage(message) {
    showMessage(message, 'info');
}

function showMessage(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.dynamic-alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show dynamic-alert`;
    alertDiv.innerHTML = `
        <i class="fas fa-${getIconForType(type)} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert at top of main content
    const main = document.querySelector('main');
    if (main) {
        main.insertBefore(alertDiv, main.firstChild);
    } else {
        document.body.insertBefore(alertDiv, document.body.firstChild);
    }
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
    
    // Scroll to top to show message
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getIconForType(type) {
    const icons = {
        'success': 'check-circle',
        'danger': 'exclamation-triangle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Phone number formatting
function formatPhoneInput(input) {
    input.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length >= 6) {
            value = `(${value.slice(0,3)}) ${value.slice(3,6)}-${value.slice(6,10)}`;
        } else if (value.length >= 3) {
            value = `(${value.slice(0,3)}) ${value.slice(3)}`;
        }
        
        e.target.value = value;
    });
}

// Initialize phone formatting for any phone inputs
document.addEventListener('DOMContentLoaded', function() {
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(formatPhoneInput);
});

// Export functions for use by other scripts
window.contactUtils = {
    deleteContact,
    showSuccessMessage,
    showErrorMessage,
    showInfoMessage,
    validateForm,
    formatPhoneInput
};
