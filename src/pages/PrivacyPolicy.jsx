import React from "react";

const PrivacyPolicy = () => {
    return (
        <div className="max-w-4xl mx-auto px-6 py-10 text-gray-800">
            <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

            <p className="mb-4 text-sm text-gray-500">
                Last Updated: {new Date().toDateString()}
            </p>

            {/* INTRO */}
            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
                <p>
                    Welcome to <strong>ScratchPad</strong>, a product by{" "}
                    <strong>FalseIdeaStudios</strong>. Your privacy matters to us.
                    This Privacy Policy explains how we collect, use, and protect your data
                    when you use ScratchPad.
                </p>
            </section>

            {/* DATA COLLECTION */}
            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">
                    2. Information We Collect
                </h2>

                <p className="mb-2 font-medium">a. Personal Information</p>
                <ul className="list-disc ml-6 space-y-1">
                    <li>Name, email address, and account details</li>
                    <li>Profile information (e.g., class, location, gender)</li>
                </ul>

                <p className="mt-4 mb-2 font-medium">b. Usage Data</p>
                <ul className="list-disc ml-6 space-y-1">
                    <li>Notes, tasks, and content you create</li>
                    <li>App usage behavior (features used, activity logs)</li>
                </ul>

                <p className="mt-4 mb-2 font-medium">c. Uploaded Media</p>
                <ul className="list-disc ml-6 space-y-1">
                    <li>Profile images and files you upload</li>
                </ul>
            </section>

            {/* USAGE */}
            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">
                    3. How We Use Your Information
                </h2>
                <ul className="list-disc ml-6 space-y-1">
                    <li>To provide and improve ScratchPad features</li>
                    <li>To personalize your experience</li>
                    <li>To maintain account security</li>
                    <li>To communicate important updates</li>
                </ul>
            </section>

            {/* DATA SHARING */}
            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">4. Data Sharing</h2>
                <p>
                    We do <strong>not sell your personal data</strong>. However, we may use
                    trusted third-party services to operate the platform.
                </p>
                <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Cloud storage providers (e.g., image hosting)</li>
                    <li>Authentication and security services</li>
                </ul>
            </section>

            {/* STORAGE */}
            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">5. Data Storage & Security</h2>
                <ul className="list-disc ml-6 space-y-1">
                    <li>Your data is stored securely using modern practices</li>
                    <li>We implement measures to prevent unauthorized access</li>
                    <li>No system is 100% secure, but we minimize risks</li>
                </ul>
            </section>

            {/* USER RIGHTS */}
            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">6. Your Rights</h2>
                <ul className="list-disc ml-6 space-y-1">
                    <li>Access and update your data</li>
                    <li>Delete your account and associated data</li>
                    <li>Request information about stored data</li>
                </ul>
            </section>

            {/* COOKIES */}
            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">
                    7. Cookies & Tracking
                </h2>
                <p>
                    ScratchPad may use cookies or similar technologies to enhance user
                    experience and maintain sessions.
                </p>
            </section>

            {/* CHILDREN */}
            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">
                    8. Children's Privacy
                </h2>
                <p>
                    ScratchPad is not intended for children under 13. We do not knowingly
                    collect data from children.
                </p>
            </section>

            {/* CHANGES */}
            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">
                    9. Changes to This Policy
                </h2>
                <p>
                    We may update this Privacy Policy from time to time. Continued use of
                    ScratchPad means you accept the updated policy.
                </p>
            </section>

            {/* CONTACT */}
            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">10. Contact</h2>
                <p>If you have any questions, contact us at:</p>
                <p className="mt-2 font-medium">falseideastudios@gmail.com</p>
            </section>

            <div className="mt-10 text-center text-sm text-gray-400">
                © {new Date().getFullYear()} ScratchPad • Built by FalseIdeaStudios
            </div>
        </div>
    );
};

export default PrivacyPolicy;