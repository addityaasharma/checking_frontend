import React from "react";

const Terms = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 text-gray-800">
      <h1 className="text-3xl font-bold mb-6">Terms & Conditions</h1>

      <p className="mb-4 text-sm text-gray-500">
        Last Updated: {new Date().toDateString()}
      </p>

      {/* INTRO */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
        <p>
          Welcome to <strong>ScratchPad</strong>, a product by{" "}
          <strong>FalseIdeaStudios</strong>. ScratchPad is a digital workspace
          designed for developers, professionals, students, and designers to
          plan systems, design APIs, manage tasks, take notes, and organize ideas.
        </p>
      </section>

      {/* USAGE */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">2. Use of the Platform</h2>
        <ul className="list-disc ml-6 space-y-1">
          <li>You must be at least 13 years old to use ScratchPad.</li>
          <li>You agree to use the platform only for lawful purposes.</li>
          <li>You are responsible for all activity under your account.</li>
        </ul>
      </section>

      {/* ACCOUNT */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">3. User Accounts</h2>
        <ul className="list-disc ml-6 space-y-1">
          <li>You must provide accurate and complete information.</li>
          <li>Do not share your login credentials with others.</li>
          <li>We reserve the right to suspend accounts for misuse.</li>
        </ul>
      </section>

      {/* DATA */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">4. User Data & Content</h2>
        <p>
          You retain ownership of the data you create on ScratchPad, including
          notes, tasks, designs, and uploaded media.
        </p>
        <ul className="list-disc ml-6 mt-2 space-y-1">
          <li>We do not sell your personal data.</li>
          <li>Your content is stored securely.</li>
          <li>You are responsible for the content you upload.</li>
        </ul>
      </section>

      {/* IMAGE UPLOAD */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">5. Media Uploads</h2>
        <p>
          ScratchPad allows users to upload images (e.g., profile pictures).
        </p>
        <ul className="list-disc ml-6 mt-2 space-y-1">
          <li>You must have rights to any content you upload.</li>
          <li>We may remove content that violates policies.</li>
          <li>Uploaded files may be processed via third-party services.</li>
        </ul>
      </section>

      {/* PROHIBITED */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">6. Prohibited Activities</h2>
        <ul className="list-disc ml-6 space-y-1">
          <li>Uploading harmful, illegal, or abusive content.</li>
          <li>Attempting to hack, reverse-engineer, or disrupt the platform.</li>
          <li>Using ScratchPad for spam or fraudulent activities.</li>
        </ul>
      </section>

      {/* SERVICE */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">7. Service Availability</h2>
        <p>
          We aim to provide uninterrupted service, but we do not guarantee that
          ScratchPad will always be available or error-free.
        </p>
      </section>

      {/* LIABILITY */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">8. Limitation of Liability</h2>
        <p>
          ScratchPad and FalseIdeaStudios are not liable for:
        </p>
        <ul className="list-disc ml-6 mt-2 space-y-1">
          <li>Data loss due to user actions or external factors.</li>
          <li>Service interruptions.</li>
          <li>Any indirect or consequential damages.</li>
        </ul>
      </section>

      {/* TERMINATION */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">9. Termination</h2>
        <p>
          We may suspend or terminate your access if you violate these terms or
          misuse the platform.
        </p>
      </section>

      {/* CHANGES */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">10. Changes to Terms</h2>
        <p>
          We may update these Terms at any time. Continued use of ScratchPad means
          you accept the updated terms.
        </p>
      </section>

      {/* CONTACT */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">11. Contact</h2>
        <p>
          For any questions regarding these Terms, contact us at:
        </p>
        <p className="mt-2 font-medium">falseideastudios@gmail.com</p>
      </section>

      <div className="mt-10 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} ScratchPad • Built by FalseIdeaStudios
      </div>
    </div>
  );
};

export default Terms;
