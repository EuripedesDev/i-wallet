import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	experimental: {
		// Room for a 4 MB image plus multipart overhead in the create/edit cofre actions.
		serverActions: { bodySizeLimit: '5mb' },
		proxyClientMaxBodySize: '5mb',
	},
};

export default nextConfig;
