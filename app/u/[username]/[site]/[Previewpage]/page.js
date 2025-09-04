'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../../contexts/AuthContext';
import { Editor, Element, Frame } from '@craftjs/core';

// Craft user components
import { Box } from '../../../../Components/user/Layout/Box';
import { FlexBox } from '../../../../Components/user/Layout/FlexBox';
import { Text } from '../../../../Components/user/Text/Text';
import { GridBox } from '../../../../Components/user/Layout/GridBox';
import { Image } from '../../../../Components/user/Media/Image';
import { Button } from '../../../../Components/user/Interactive/Button';
import { Link } from '../../../../Components/user/Interactive/Link';
import { Paragraph } from '../../../../Components/user/Text/Paragraph';
import { Video } from '../../../../Components/user/Media/Video';
import { ShopFlexBox, ShopImage, ShopText } from '../../../../Components/user/Advanced/ShopFlexBox';
import { FormInput } from '../../../../Components/user/Input';
import { Form, FormInputDropArea } from '../../../../Components/user/Advanced/Form';
import { Carousel } from '../../../../Components/user/Media/Carousel';
import { NavBar, NavItem } from '../../../../Components/user/Nav/NavBar';
import { Root } from '../../../../Components/core/Root';
import { MultiSelectProvider } from '../../../../Components/utils/context/MultiSelectContext';
import { PagesProvider } from '../../../../Components/utils/context/PagesContext';

import { db } from '@/lib/firebase';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { getSitePages, getPage, getPublicSite } from '../../../../../lib/sites';

export default function PreviewSinglePage() {
	const { username, site, Previewpage } = useParams();
		const searchParams = useSearchParams();
	const { user, loading } = useAuth();

	// Derive stable primitive values early to avoid conditional hook drift
	const routeUsername = useMemo(() => String(username || '').toLowerCase(), [username]);
	const currentUserUsername = useMemo(() => String(user?.username || '').toLowerCase(), [user?.username]);
	const isOwner = !!user && currentUserUsername && currentUserUsername === routeUsername && user?.uid; 
	const isAdmin = !!user && (user.isAdmin || user.subscriptionTier === 'admin' || user.subscription?.plan === 'admin');

	const [authError, setAuthError] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [pageContent, setPageContent] = useState(null); // serialized object or string
	const [pageTitle, setPageTitle] = useState('');
	const [debugInfo, setDebugInfo] = useState(null); // Store debug info about the page load

	const targetKey = useMemo(() => (Array.isArray(Previewpage) ? Previewpage[0] : Previewpage), [Previewpage]);

	// Debug panel state
	const [showDebug, setShowDebug] = useState(false);
	const [debugView, setDebugView] = useState('original'); // 'original' | 'content' | 'frame' | 'compressed'
	const isDebugMode = typeof window !== 'undefined' && (
		new URLSearchParams(window.location.search).get('debug') === '1' ||
		new URLSearchParams(window.location.search).get('dbg') === '1'
	);

	// Debug functions
	const debugFunctions = {
		logPageContent: () => {
			console.log('[Debug] Page Content:', pageContent);
		},
		logFrameData: () => {
			console.log('[Debug] Raw Frame Data:', rawFrameData);
			console.log('[Debug] Safe Frame Data:', safeFrameData);
		},
		validateNodes: () => {
			if (pageContent && typeof pageContent === 'object') {
				const nodes = Object.keys(pageContent);
				console.log('[Debug] Node validation:');
				nodes.forEach(nodeId => {
					const node = pageContent[nodeId];
					const hasType = node?.type?.resolvedName;
					const hasProps = node?.props;
					console.log(`  ${nodeId}: type=${hasType || 'MISSING'}, props=${!!hasProps}`);
				});
			}
		},
		testSanitization: () => {
			if (rawFrameData) {
				const result = sanitizeSerializedData(rawFrameData);
				console.log('[Debug] Sanitization test result:', result);
			}
		},
		exportDebugData: () => {
			const data = {
				username,
				site,
				targetKey,
				pageTitle,
				pageContent,
				rawFrameData,
				safeFrameData,
				debugInfo,
				timestamp: new Date().toISOString()
			};
			const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `preview-debug-${username}-${site}-${targetKey}-${Date.now()}.json`;
			a.click();
			URL.revokeObjectURL(url);
		}
	};

	// Effect: load site + page content (public preview) once params + auth resolved
	useEffect(() => {
		let isMounted = true;
		const load = async () => {
			if (!username || !site || !targetKey) return; // wait for params
			// Avoid reloading if we already have content for same page
			try {
				setAuthError(null);
				setIsLoading(true);

				// Resolve the site (public access). getPublicSite returns null if not found
				const publicSite = await getPublicSite(username, site);
				if (!publicSite) {
					if (isMounted) {
						setAuthError('Site not found or inaccessible.');
						setIsLoading(false);
					}
					return;
				}
				const siteId = publicSite.id;
				const ownerUserId = publicSite.userId;

				// Permission: allow if published OR user is owner OR admin
				const allow = publicSite.isPublished || isOwner || isAdmin;
				if (!allow) {
					if (isMounted) {
						setAuthError('This site is not published. Access limited to owner/admin.');
						setIsLoading(false);
					}
					return;
				}

				// Get pages list to find requested page (by slug or name)
				const pages = await getSitePages(ownerUserId, siteId);
				let targetPage = pages.find(p => p.slug === targetKey || p.name === targetKey || p.id === targetKey);
				if (!targetPage) {
					// Fallback: home
					targetPage = pages.find(p => p.isHome) || null;
				}
				if (!targetPage) {
					if (isMounted) {
						setAuthError('Page not found.');
						setIsLoading(false);
					}
					return;
				}

				// Fetch full page (includes decompressed content)
				const fullPage = await getPage(ownerUserId, siteId, targetPage.id);
				const content = fullPage?.content || null;
				if (isMounted) {
					setPageTitle(fullPage.name || fullPage.slug || 'Untitled');
					setPageContent(content); // raw object
					setDebugInfo({
						site: publicSite,
						pages: pages.length,
						targetPage: targetPage,
						fullPage: { ...fullPage, content: '[CONTENT_OBJECT]' }, // Don't store full content in debug
						loadTime: Date.now()
					});
					setIsLoading(false);
				}
			} catch (err) {
				console.error('[Preview] Load error', err);
				if (isMounted) {
					setAuthError(err.message || 'Failed to load preview');
					setIsLoading(false);
				}
			}
		};
		load();
		return () => { isMounted = false; };
	}, [username, site, targetKey, isOwner, isAdmin]);

  // Frame data + resolver & sanitization hooks MUST come before any conditional returns
  const rawFrameData = useMemo(() => {
    if (!pageContent) return null;
    return typeof pageContent === 'string' ? pageContent : JSON.stringify(pageContent);
  }, [pageContent]);

	// Resolver map stable reference
	const resolverMap = useMemo(() => ({
		Box,
		FlexBox,
		Text,
		GridBox,
		Image,
		Button,
		CraftButton: Button, // Map legacy CraftButton to Button
		Link,
		Paragraph,
		Video,
		ShopFlexBox,
		ShopImage,
		ShopText,
		FormInput,
		Form,
		FormInputDropArea,
		Carousel,
		NavBar,
		NavItem,
		Root,
		Element,
	}), []);

	// Sanitizer (must be stable across renders)
	const sanitizeSerializedData = useCallback((rawJsonString) => {
		try {
			const data = typeof rawJsonString === 'string' ? JSON.parse(rawJsonString) : rawJsonString;
			if (!data || typeof data !== 'object') return rawJsonString; // nothing to do

			const sanitized = {};
			const resolverNames = new Set(Object.keys(resolverMap));
			let modified = false;
			let autoCounter = 0;

			Object.entries(data).forEach(([id, node]) => {
				if (!node || typeof node !== 'object') {
					modified = true;
					console.warn('[Preview sanitize] Dropping node with invalid value:', id, node);
					return;
				}
				const resolvedName = node?.type?.resolvedName;
				if (!resolvedName) {
					modified = true;
					console.warn('[Preview sanitize] Node missing type.resolvedName, replacing with Text placeholder:', id, node);
					sanitized[id] = {
						...node,
						type: { resolvedName: 'Text' },
						props: {
							text: '[Unsupported component replaced]',
							fontSize: 14,
							color: '#000'
						},
					};
					return;
				}
				if (!resolverNames.has(resolvedName)) {
					modified = true;
					console.warn('[Preview sanitize] Unknown component name in serialized tree:', resolvedName, '-> replacing with Text');
					sanitized[id] = {
						...node,
						type: { resolvedName: 'Text' },
						props: { text: `[Missing component: ${resolvedName}] #${++autoCounter}` }
					};
					return;
				}
				if (resolvedName === 'Button' || resolvedName === 'CraftButton') {
					const originalProps = (node.props && typeof node.props === 'object') ? { ...node.props } : {};
					const requiredDefaults = {
						text: 'Click Me',
						backgroundColor: '#1890ff',
						color: '#ffffff',
						padding: '8px 16px',
						margin: '5px 0',
						display: 'inline-flex',
						fontSize: 14,
						fontWeight: '400',
						border: '1px solid #1890ff',
						borderRadius: 6,
						buttonType: 'primary',
						size: 'medium',
						hidden: false
					};
					let changed = false;
					Object.entries(requiredDefaults).forEach(([k,v]) => {
						if (originalProps[k] === undefined) { originalProps[k] = v; changed = true; }
					});
					if (changed) {
						modified = true;
						console.info('[Preview sanitize] Injected missing Button defaults on node', id);
					}
					sanitized[id] = { ...node, props: originalProps };
				} else {
					sanitized[id] = node;
				}
			});

			if (modified) {
				console.info('[Preview sanitize] Serialized data modified to prevent crash.');
				return JSON.stringify(sanitized);
			}
			return typeof rawJsonString === 'string' ? rawJsonString : JSON.stringify(rawJsonString);
		} catch (err) {
			console.error('[Preview sanitize] Failed to sanitize serialized data:', err);
			return rawJsonString; // fall back
		}
	}, [resolverMap]);

	const safeFrameData = useMemo(() => rawFrameData ? sanitizeSerializedData(rawFrameData) : null, [rawFrameData, sanitizeSerializedData]);
  // Conditional UI below must not change hook order; keep returns after hooks defined above
	if (loading || isLoading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<h2 className="text-lg font-semibold text-gray-700">Loading preview…</h2>
				</div>
			</div>
		);
	}

	if (authError) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="max-w-md w-full bg-white rounded-lg shadow p-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-2">Preview Restricted</h2>
					<p className="text-gray-600 whitespace-pre-line">{authError}</p>
				</div>
			</div>
		);
	}

	if (!pageContent) {
		return (
			<div className="min-h-screen bg-white flex items-center justify-center">
				<div className="text-center">
					<h2 className="text-xl font-semibold text-gray-900">No content</h2>
					<p className="text-gray-500 mt-1">This page has no content yet.</p>
				</div>
			</div>
		);
	}

	return (
			<div className="min-h-screen bg-white">
				{/* Debug Panel */}
				{(isDebugMode || showDebug) && (
					<div style={{
						position: 'fixed',
						right: 12,
						top: 12,
						zIndex: 99999,
						background: 'rgba(0,0,0,0.9)',
						color: 'white',
						padding: 16,
						borderRadius: 8,
						maxWidth: 600,
						maxHeight: '80vh',
						overflow: 'auto',
						fontFamily: 'monospace',
						fontSize: 12
					}}>
						<div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: 12 }}>
							<h3 style={{ margin: 0, fontSize: 14, fontWeight: 'bold' }}>🔍 Preview Debug Panel</h3>
							<button
								onClick={() => setShowDebug(false)}
								style={{
									background: 'rgba(255,255,255,0.2)',
									border: 'none',
									color: 'white',
									padding: '4px 8px',
									borderRadius: 4,
									cursor: 'pointer',
									marginLeft: 'auto'
								}}
							>
								✕
							</button>
						</div>
						
						{/* Debug Controls */}
						<div style={{ marginBottom: 12 }}>
							<div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
								<button
									onClick={() => setDebugView('original')}
									style={{
										background: debugView === 'original' ? '#2563eb' : 'rgba(255,255,255,0.2)',
										border: 'none',
										color: 'white',
										padding: '4px 8px',
										borderRadius: 4,
										cursor: 'pointer',
										fontSize: 11
									}}
								>
									Original Debug
								</button>
								<button
									onClick={() => setDebugView('content')}
									style={{
										background: debugView === 'content' ? '#2563eb' : 'rgba(255,255,255,0.2)',
										border: 'none',
										color: 'white',
										padding: '4px 8px',
										borderRadius: 4,
										cursor: 'pointer',
										fontSize: 11
									}}
								>
									Page Content JSON
								</button>
								<button
									onClick={() => setDebugView('frame')}
									style={{
										background: debugView === 'frame' ? '#2563eb' : 'rgba(255,255,255,0.2)',
										border: 'none',
										color: 'white',
										padding: '4px 8px',
										borderRadius: 4,
										cursor: 'pointer',
										fontSize: 11
									}}
								>
									Craft Frame JSON
								</button>
								<button
									onClick={() => setDebugView('compressed')}
									style={{
										background: debugView === 'compressed' ? '#2563eb' : 'rgba(255,255,255,0.2)',
										border: 'none',
										color: 'white',
										padding: '4px 8px',
										borderRadius: 4,
										cursor: 'pointer',
										fontSize: 11
									}}
								>
									Compressed Data
								</button>
							</div>
							
							{/* Debug Function Buttons */}
							<div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
								{Object.entries(debugFunctions).map(([name, fn]) => (
									<button
										key={name}
										onClick={fn}
										style={{
											background: '#059669',
											border: 'none',
											color: 'white',
											padding: '2px 6px',
											borderRadius: 3,
											cursor: 'pointer',
											fontSize: 10
										}}
									>
										{name.replace(/([A-Z])/g, ' $1').toLowerCase()}
									</button>
								))}
							</div>
						</div>

						{/* Debug Content */}
						<div style={{ maxHeight: 400, overflow: 'auto' }}>
							{debugView === 'original' && (
								<div>
									<div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
										Original Debug Info (same as old debug panel):
									</div>
									<pre style={{ 
										background: 'rgba(255,255,255,0.1)', 
										padding: 8, 
										borderRadius: 4, 
										fontSize: 10,
										whiteSpace: 'pre-wrap',
										wordBreak: 'break-word'
									}}>
										{JSON.stringify({
											siteInfo: debugInfo?.site,
											pagesCount: debugInfo?.pages || 0,
											pageTitle: pageTitle,
											frameDataPreview: safeFrameData ? safeFrameData.slice(0, 400) + '...' : 'No frame data',
											targetKey,
											username,
											site
										}, null, 2)}
									</pre>
								</div>
							)}
							
							{debugView === 'content' && (
								<div>
									<div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
										Raw Page Content (from database):
									</div>
									<pre style={{ 
										background: 'rgba(255,255,255,0.1)', 
										padding: 8, 
										borderRadius: 4, 
										fontSize: 10,
										whiteSpace: 'pre-wrap',
										wordBreak: 'break-word'
									}}>
										{pageContent ? JSON.stringify(pageContent, null, 2) : 'No content'}
									</pre>
									
									{debugInfo && (
										<div style={{ marginTop: 12 }}>
											<div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
												Extended Debug Info:
											</div>
											<pre style={{ 
												background: 'rgba(255,255,255,0.1)', 
												padding: 8, 
												borderRadius: 4, 
												fontSize: 10,
												whiteSpace: 'pre-wrap'
											}}>
												{JSON.stringify(debugInfo, null, 2)}
											</pre>
										</div>
									)}
								</div>
							)}

							{debugView === 'frame' && (
								<div>
									<div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
										Sanitized Craft.js Frame (JSON):
									</div>
									<pre style={{ 
										background: 'rgba(255,255,255,0.1)', 
										padding: 8, 
										borderRadius: 4, 
										fontSize: 10,
										whiteSpace: 'pre-wrap',
										wordBreak: 'break-word'
									}}>
										{pageContent ? JSON.stringify(pageContent, null, 2) : 'No frame JSON'}
									</pre>
								</div>
							)}
							
							{debugView === 'compressed' && (
								<div>
									<div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
										Raw Frame Data String:
									</div>
									<pre style={{ 
										background: 'rgba(255,255,255,0.1)', 
										padding: 8, 
										borderRadius: 4, 
										fontSize: 10,
										whiteSpace: 'pre-wrap',
										wordBreak: 'break-all'
									}}>
										{rawFrameData || 'No raw data'}
									</pre>
									
									<div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, marginTop: 12 }}>
										Sanitized Frame Data String:
									</div>
									<pre style={{ 
										background: 'rgba(255,255,255,0.1)', 
										padding: 8, 
										borderRadius: 4, 
										fontSize: 10,
										whiteSpace: 'pre-wrap',
										wordBreak: 'break-all'
									}}>
										{safeFrameData || 'No sanitized data'}
									</pre>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Debug Toggle Button */}
				{!showDebug && (isDebugMode || window.location.search.includes('debug')) && (
					<button
						onClick={() => setShowDebug(true)}
						style={{
							position: 'fixed',
							right: 12,
							top: 12,
							zIndex: 99998,
							background: '#2563eb',
							color: 'white',
							border: 'none',
							padding: '8px 12px',
							borderRadius: 6,
							cursor: 'pointer',
							fontSize: 12,
							fontWeight: 'bold'
						}}
					>
						🔍 Debug
					</button>
				)}

				<div className="w-full overflow-auto">
					<Editor
					resolver={{
						Box,
						FlexBox,
						Text,
						GridBox,
						Image,
						Button,
						CraftButton: Button, // Map legacy CraftButton to Button
						Link,
						Paragraph,
						Video,
						ShopFlexBox,
						ShopImage,
						ShopText,
						FormInput,
						Form,
						FormInputDropArea,
						Carousel,
						NavBar,
						NavItem,
						Root,
						Element,
					}}
								enabled={false}
							>
								<PagesProvider>
									<MultiSelectProvider>
										<Frame data={safeFrameData || rawFrameData || '{}'} className="w-full">
											<Element
												is={Root}
												padding={0}
												background="#ffffff"
												canvas
												className="w-full"
												style={{ maxWidth: '100%', minWidth: '100%', overflow: 'hidden' }}
											/>
										</Frame>
									</MultiSelectProvider>
								</PagesProvider>
							</Editor>
			</div>
		</div>
	);
}

