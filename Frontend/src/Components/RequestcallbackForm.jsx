import React, { useState, useRef, useEffect } from "react";

const RequestCallbackForm = ({ onClose }) => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    message: ""
  });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const modalRef = useRef(null);

  // Focus trap & ESC close
  useEffect(() => {
    const focusableEls = modalRef.current.querySelectorAll(
      'input, textarea, button'
    );
    const firstEl = focusableEls[0];
    const lastEl = focusableEls[focusableEls.length - 1];

    function handleTab(e) {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }
    function handleEsc(e) {
      if (e.key === "Escape") onClose();
    }
    modalRef.current.focus();
    document.addEventListener("keydown", handleTab);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("keydown", handleTab);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.phone) newErrors.phone = "Phone number is required";
    else if (!/^[0-9]{10,15}$/.test(formData.phone.replace(/\D/g, ""))) newErrors.phone = "Enter a valid phone number";
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
    setServerError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    try {
      const res = await fetch("http://localhost:5000/api/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
        setTimeout(onClose, 2000);
      } else {
        setServerError(data.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setServerError("Could not connect to server. Please try again.",err);
    }
  };

  return (
    <>
      <div className="request-callback-overlay" tabIndex={-1} aria-modal="true" role="dialog">
        <div className="request-callback-container" ref={modalRef}>
          <button className="close-btn" onClick={onClose} aria-label="Close form">&times;</button>
          {!submitted ? (
            <>
              <h2>Request Callback</h2>
              <form onSubmit={handleSubmit} className="request-callback-form" autoComplete="off">
                <label htmlFor="name">Name:</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                  aria-invalid={!!errors.name}
                />
                {errors.name && <div className="error">{errors.name}</div>}

                <label htmlFor="phone">Phone Number:</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="Enter your phone number"
                  aria-invalid={!!errors.phone}
                />
                {errors.phone && <div className="error">{errors.phone}</div>}

                <label htmlFor="message">Message (optional):</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="How can we help you?"
                />

                {serverError && <div className="error">{serverError}</div>}

                <button type="submit" className="submit-btn">Request Callback</button>
              </form>
            </>
          ) : (
            <div className="success-message">
              <h3>Thank you!</h3>
              <p>We have received your request. Our team will contact you soon.</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .request-callback-overlay {
          position: fixed;
          top: 0; left: 0;
          width: 100vw; height: 100vh;
          background: rgba(0, 0, 0, 0.18);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding-top: 72px;
          z-index: 1000;
          overflow-y: auto;
          transition: background 0.3s;
        }

        .request-callback-container {
          background: rgba(255,255,255,0.93);
          border-radius: 2rem;
          width: 95%;
          max-width: 420px;
          margin-bottom: 48px;
          padding: 2.2rem 2.2rem 1.7rem 2.2rem;
          box-shadow: 0 8px 32px 0 rgba(44,83,100,0.18), 0 0 0 2px #a5b4fc44;
          border: 1.5px solid rgba(106, 17, 203, 0.18);
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: fadeInUpForm 0.7s cubic-bezier(.4,0,.2,1);
          max-height: calc(100vh - 120px);
          overflow-y: auto;
        }

        @keyframes fadeInUpForm {
          from { opacity: 0; transform: translateY(60px) scale(0.97);}
          60% { opacity: 0.7; transform: translateY(-12px) scale(1.04);}
          to   { opacity: 1; transform: translateY(0) scale(1);}
        }

        .request-callback-form label {
          display: block;
          margin-bottom: 0.35rem;
          font-weight: 700;
          color: #2563eb;
          letter-spacing: 0.5px;
        }

        .request-callback-form input,
        .request-callback-form textarea {
          width: 100%;
          padding: 0.75rem 1rem;
          margin-bottom: 1.1rem;
          border: 2px solid #a5b4fc44;
          border-radius: 1rem;
          font-size: 1.08rem;
          background: rgba(245, 245, 255, 0.96);
          font-family: inherit;
          transition: border-color 0.25s, box-shadow 0.25s;
          box-shadow: 0 2px 8px rgba(44,83,100,0.04) inset;
        }

        .request-callback-form input:focus,
        .request-callback-form textarea:focus {
          border-color: #6366f1;
          box-shadow: 0 0 8px #a5b4fc66;
          outline: none;
        }

        .request-callback-form textarea {
          min-height: 80px;
          resize: vertical;
        }

        .submit-btn {
          width: 100%;
          padding: 0.9rem;
          background: linear-gradient(90deg, #2563eb 0%, #06b6d4 100%);
          color: #fff;
          border: none;
          border-radius: 1rem;
          font-size: 1.13rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 16px 0 #2563eb33;
          letter-spacing: 0.5px;
          transition: background 0.22s, transform 0.18s, box-shadow 0.18s;
        }

        .submit-btn:hover,
        .submit-btn:focus {
          background: linear-gradient(90deg, #06b6d4 0%, #2563eb 100%);
          transform: translateY(-2px) scale(1.04);
          box-shadow: 0 6px 28px 0 #06b6d455;
        }

        .close-btn {
          background: transparent;
          border: none;
          font-size: 2rem;
          position: absolute;
          right: 1.2rem;
          top: 1.2rem;
          cursor: pointer;
          color: #6366f1;
          transition: color 0.3s;
        }

        .close-btn:hover {
          color: #06b6d4;
        }

        .error {
          color: #d32f2f;
          font-size: 0.97rem;
          margin-top: -0.7rem;
          margin-bottom: 1rem;
          font-weight: 600;
        }

        .success-message {
          text-align: center;
          color: #22c55e;
          font-weight: 700;
          font-size: 1.25rem;
          letter-spacing: 0.5px;
        }

        @media (max-width: 600px) {
          .request-callback-container {
            padding: 1.3rem 0.7rem 1rem 0.7rem;
            width: 99%;
            border-radius: 1.1rem;
          }
          .request-callback-form input,
          .request-callback-form textarea {
            font-size: 1rem;
            border-radius: 0.7rem;
          }
        }
      `}</style>
    </>
  );
};

export default RequestCallbackForm;
