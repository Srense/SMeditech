import React from 'react';
import './WhatWeTreat.css';

const WhatWeTreat = () => {
  const conditions = [
    "Lumbar Spondylosis", "Pes Anserine Bursitis", "Quadriceps Muscle Strain", "Herniated Disk Or Slipped Disc", "Clubfoot Or Congenital Talipes Equinovarus Or Ctev", "Ankle Bone Spur", "Total Hip Replacement (thr)", "Swan Neck Deformity", "Erb’s Palsy", "Sprengel's Shoulder", "Meralgia Paresthetica", "Tendinitis", "Guillain-barré Syndrome", "Fecal Incontinence", "Radial Nerve Injury", "Sacralization", "Shoulder Impingement", "Disc Bulge", "Dyslexia", "Genu Valgus", "Genu Varum", "Cauda Equina Syndrome", "Wartenberg’s Syndrome", "Shoulder Arthropathy", "Cuboid Syndrome", "Median Nerve Injury", "Hemangioma", "Raynaud’s Disease", "Urinary Incontinence", "Pelvic Organ Prolapse", "Motor Neuron Disease (mnd)", "Complex Regional Pain Syndrome (crps)", "Cervicogenic Headache", "Infantile Hemiparesis", "Galeazzi Fracture", "Lymphedema", "Wrist Drop", "Trigger Finger", "Retrolisthesis", "Klumpke's Palsy", "Supraspinatus Tendinitis", "Lumbarization", "Foot Drop", "Smith Fracture", "Gastrocnemius Rupture", "Osgood-schlatter Disease", "Hill-sachs Lesion", "Hemiplegia", "Myositis Ossification (mo)", "Huntington's Disease (hd)", "Systemic Lupus Erythematosus (sle)", "Reiter's Syndrome", "Peripheral Artery Disease (pad)", "Cervical Spondylosis", "Frozen Shoulder", "Vertigo", "Achilles Tendon Rupture", "Carpal Tunnel Syndrome (cts)", "Arthritis", "Chondromalacia Patella", "Knee Bursitis", "Anterior Cruciate Ligament Tear(acl)", "Ankle Sprain", "Cerebral Palsy", "Sciatica", "Parkinson's Disease", "Tennis Elbow", "Baastrup Syndrome", "Osteoarthritis", "Cervical Myelopathy", "Osteoporosis", "Whiplash", "Rotator Cuff Injury", "Scoliosis", "Bell's Palsy Or Facial Palsy", "Dementia", "Plantar Fasciitis", "Concussion", "Spinal Stenosis", "Rheumatoid Arthritis", "Tailbone Pain/coccydynia", "Piriformis Syndrome", "Myasthenia Gravis (mg)", "Diabetic Neuropathy", "Degenerative Disc Disease", "Distal Muscular Dystrophy", "Asthma", "Temporomandibular Joint (tmj)", "Stroke Or Cerebrovascular Accident (cva)", "Hamstring Strain", "Fibromyalgia Syndrome", "Total Knee Replacement(tkr)", "Meniscal Injury", "Spina Bifida", "Down Syndrome", "Torticollis", "Shoulder Dislocation", "Shoulder And Arm Fractures", "Elbow Fractures", "Forearm Fractures", "Wrist Fracture", "Hand Fractures", "Mallet Finger", "Boutonniere Deformity", "Ganglion Cyst", "Burns", "De Quervain's Tenosynovitis", "Cubital Tunnel Syndrome", "Biceps Tendonitis", "Radial Tunnel Syndrome", "Hip Fracture", "Trochanteric Bursitis", "Hip Labral Tear", "Hip Impingement", "Hip Osteoarthritis", "Patellar Fracture", "Patella Dislocation", "Medial Collateral Ligament (mcl) Injury", "Lateral Collateral Ligament(lcl) Injury", "Posterior Cruciate Ligament(pcl) Injury", "Popliteal (baker's) Cyst", "Varicose Veins", "Patellar Tendonitis", "Deep Venous Thrombosis", "Knee Fracture", "Flat Foot", "Ankle Fracture", "Ankle Syndesmosis Ligament Injury", "Ankle Dislocation", "Tarsal Tunnel Syndrome", "Ankle Instability", "Posterior Tibial Tendon Dysfunction (pttd)", "Metatarsalgia", "Bunion Or Hallux Valgus", "Morton's Neuroma", "Diabetic Foot", "Hammer Toe", "Knee Osteoarthritis", "Golfer's Elbow", "Spondylolisthesis", "Ankylosing Spondylitis (as)", "Discectomy", "Laminectomy", "Autism", "Spinal Fusion", "Spinal Cord Injury", "Leprosy", "Migraine", "Multiple Sclerosis", "Quadriplegia", "Ulnar Nerve Injury", "Transverse Myelitis (tm)"
  ];

  const symptoms = [
    "Muscle Stiffness", "Muscle Spasm", "Crepitus - Cracking Joints", "Numbness And Tingling", "Neck Pain", "Foot Pain", "Tremors", "Knee Pain", "Back Pain", "Joint Pain", "Shoulder Pain", "Loss Of Balance", "Inflammation", "Headache", "Shortness Of Breath", "Sprains And Strains"
  ];

  const therapies = [
    "Interferential Therapy (ift)", "Chiropractic Therapy", "Ultrasound Therapy", "Laser Therapy", "Traction Therapy", "Wax Therapy", "Kinesio Taping / Taping Therapy", "Dry Needling Therapy", "Thermotherapy(heat Therapy)", "Transcutaneous Electrical Nerve Stimulation(tens) Therapy", "Lymphatic Drainage Massage", "Overhead Track Harness Therapy", "Tecar / Cret Therapy", "Manual Therapy", "Spinal Decompression / Traction Therapy", "Cupping Therapy", "Acupuncture", "Myofascial Release (mfr)", "Soft Tissue Mobilization", "Pelvic Floor Physical Therapy", "Cryotherapy(cold Therapy)", "Chest Physiotherapy", "Shockwave Therapy", "Post-covid Physiotherapy", "Shortwave Diathermy (swd)"
  ];

  const services = [
    "Chiropractor Treatment", "Sports Physiotherapy", "Pediatric Physiotherapy", "Home Care Physiotherapy", "Neuro Physiotherapy - Rehab"
  ];

  return (
    <section className="what-we-treat">
      <h2 className="section-title">WHAT WE TREAT</h2>
      <p className="section-description">
        We provide specialized physiotherapy treatments for neurological, orthopedic, musculoskeletal, pediatric, geriatric, and sports-related conditions — addressing a wide range of symptoms and recovery needs.
      </p>
      <div className="treat-columns">
        <div className="treat-section">
          <h3>Conditions</h3>
          <ul className="treat-list">
            {conditions.map((condition, index) => <li key={index}>{condition}</li>)}
          </ul>
        </div>
        <div className="treat-section">
          <h3>Symptoms</h3>
          <ul className="treat-list">
            {symptoms.map((symptom, index) => <li key={index}>{symptom}</li>)}
          </ul>
        </div>
        <div className="treat-section">
          <h3>Therapies Offered</h3>
          <ul className="treat-list">
            {therapies.map((therapy, index) => <li key={index}>{therapy}</li>)}
          </ul>
        </div>
        <div className="treat-section">
          <h3>Services Offered</h3>
          <ul className="treat-list">
            {services.map((service, index) => <li key={index}>{service}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default WhatWeTreat;

