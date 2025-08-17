import path from 'path';

/**
 * Next.js configuration
 * We inject a webpack alias so every import of 'firebase/firestore' is routed
 * through our debug wrapper (lib/firestoreDebug.js) without needing to touch
 * every source file. This lets us centrally log any improper getDocs usage
 * (e.g., passing a DocumentReference) and avoid silent duplication of the
 * Firestore module that could cause prototype identity mismatches.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		// Lightning CSS for CSS optimization/minification
		optimizeCss: true,
	},
	webpack(config) {
		config.resolve = config.resolve || {};
		config.resolve.alias = config.resolve.alias || {};
		// IMPORTANT: Alias must point to the absolute path of the wrapper.
		// The wrapper itself internally resolves the real Firestore implementation
		// via an absolute path to avoid recursive aliasing.
		config.resolve.alias['firebase/firestore'] = path.resolve(__dirname, 'lib/firestoreDebug.js');
		return config;
	}
};

export default nextConfig;
