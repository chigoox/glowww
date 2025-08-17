import path from 'path';
import { fileURLToPath } from 'url';

// ESM does not provide __dirname; derive it from import.meta.url
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
		return config;
	}
};

export default nextConfig;
