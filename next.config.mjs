/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		// Use Lightning CSS for CSS optimization/minification to avoid cssnano-simple issues
		optimizeCss: true,
	},
};

export default nextConfig;
