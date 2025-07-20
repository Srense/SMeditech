import React from 'react';
import './FAQ.css';

const faqs = [
  {
    question: "What is S.MediTech?",
    answer: "S.MediTech is a next-generation digital health-care platform transforming physiotherapy through telerehabilitation and personalized care solutions. Our system integrates intelligent exercise guidance, real-time progress tracking, prescription management, and remote consultations all accessible from the patient’s home. With the inclusion of game-based therapy, we turn conventional rehabilitation into an engaging, interactive experience, encouraging consistent participation and faster recovery thereby making rehabilitation smarter, simpler, and more motivating as well engaging."


  },
  {
    question: "How can I start exercises?",
    answer: "S.MediTech provides a structured, guided physiotherapy experience categorized into Upper, Middle, and Lower body regions. Each region includes specific body parts—such as hands, spine, or knees—with associated exercises like hand rotations, finger twirls, knee extensions, and more. Once an exercise is selected, the platform delivers real-time, step-by-step video instructions, along with optional game-based therapy modules to enhance engagement and motivation. After completing each session, S.MediTech automatically analyzes real-time performance data, including repetition count, range of motion, time taken, and milestones achieved. Based on this, dynamic progress graphs are generated—visually representing your recovery trends. These insights can be tracked within your dashboard and seamlessly shared with your physiotherapist for continuous, personalized care."
  },
  {
    question: "Do you offer home care physiotherapy?",
    answer: "Yes. S.MediTech offers expert home care physiotherapy tailored to your recovery needs. You can schedule home visits by certified physiotherapists directly through our platform. Whether it’s for post-surgery rehab, chronic conditions, or mobility challenges, our team ensures personalized and professional care at your doorstep, supported by digital progress tracking and optional virtual follow-ups."
  },
  {
    question: "Are the therapies personalized?",
    answer: "Absolutely. Every therapy on S.MediTech is intelligently personalized and dynamically updated. We use expert therapist input to design programs aligned with your recovery goals. As you progress, the system adapts the routine in real-time—incorporating game-based therapy, flexibility exercises, and targeted routines—ensuring optimal outcomes through precision-driven care."
  },
  {
    question: "How do I contact support?",
    answer: "We provide 24/7 support to ensure a seamless experience for every user. You can reach us via the in-app support chat, email, or our dedicated helpline. Visit the ‘Support’ section on your dashboard to raise a query, access help resources, or schedule a callback with our support team."
  }
];

const FAQ = () => {
  const [activeIndex, setActiveIndex] = React.useState(null);

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section className="faq-section">
      <h2 className="section-title">Frequently Asked Questions</h2>
      <div className="faq-list">
        {faqs.map((faq, index) => (
          <div 
            key={index} 
            className={`faq-item ${activeIndex === index ? 'active' : ''}`} 
            onClick={() => toggleFAQ(index)}
            tabIndex={0}
            onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') toggleFAQ(index); }}
            role="button"
            aria-expanded={activeIndex === index}
            aria-controls={`faq-answer-${index}`}
            aria-labelledby={`faq-question-${index}`}
          >
            <div className="faq-question" id={`faq-question-${index}`}>{faq.question}</div>
            <div 
              className="faq-answer" 
              id={`faq-answer-${index}`} 
              style={{ maxHeight: activeIndex === index ? '500px' : '0' }}
            >
              <p>{faq.answer}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FAQ;
