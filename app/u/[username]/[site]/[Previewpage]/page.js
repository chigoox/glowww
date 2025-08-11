'use client';

import React, { useEffect, useMemo, useState } from 'react';
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

import { db } from '../../../../../lib/firebase';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { getSitePages, getPage } from '../../../../../lib/sites';

export default function PreviewSinglePage() {
	const { username, site, Previewpage } = useParams();
		const searchParams = useSearchParams();
	const { user, loading } = useAuth();

	const [authError, setAuthError] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [pageContent, setPageContent] = useState(null); // serialized object or string
	const [pageTitle, setPageTitle] = useState('');

	const targetKey = useMemo(() => (Array.isArray(Previewpage) ? Previewpage[0] : Previewpage), [Previewpage]);

	useEffect(() => {
		let mounted = true;
		const load = async () => {
			try {
				setIsLoading(true);
				setAuthError(null);

			const routeUsername = String(username || '').toLowerCase();
			const providedToken = searchParams?.get('token');

				// Find the user by username to get UID (and double-check)
				const usersRef = collection(db, 'users');
				const userQ = query(usersRef, where('username', '==', routeUsername), limit(1));
				const userSnap = await getDocs(userQ);
				if (userSnap.empty) {
					throw new Error('Owner account not found');
				}
			const ownerId = userSnap.docs[0].id;

				// Find the site by name (no publish requirement for owner preview)
				const sitesRef = collection(db, 'users', ownerId, 'sites');
				const siteQ = query(sitesRef, where('name', '==', site), limit(1));
				const siteSnap = await getDocs(siteQ);
						if (siteSnap.empty) {
					throw new Error('Site not found');
				}
						const siteDoc = siteSnap.docs[0];
						const siteData = siteDoc.data();
						const siteId = siteDoc.id;

						// Access control: allow if token matches; otherwise enforce owner
						const sitePreviewToken = siteData?.previewToken || null;
						const tokenMatches = providedToken && sitePreviewToken && providedToken === sitePreviewToken;

						if (!tokenMatches) {
							// Wait for auth and enforce ownership
							if (loading) return;
							if (!user) {
								setAuthError('You must be signed in to view this preview.');
								return;
							}
							const currentUsername = String(user.username || '').toLowerCase();
							if (!currentUsername || currentUsername !== routeUsername || ownerId !== user.uid) {
								setAuthError('You do not have permission to preview this page.');
								return;
							}
						}

				// Load pages list to resolve the one page
				const pagesMeta = await getSitePages(ownerId, siteId);
				const findByTitleSlug = (title) =>
					String(title || '')
						.toLowerCase()
						.replace(/[^a-z0-9]/g, '-');

				const targetMeta =
					pagesMeta.find((p) => p.id === targetKey) ||
					pagesMeta.find((p) => p.key === targetKey) ||
					pagesMeta.find((p) => p.slug === targetKey) ||
					pagesMeta.find((p) => findByTitleSlug(p.title) === targetKey);

				if (!targetMeta) {
					throw new Error('Requested page was not found in this site');
				}

				// Load full page content
				const full = await getPage(ownerId, siteId, targetMeta.id);
				if (!mounted) return;
				setPageTitle(full.title || targetMeta.name || '');
				setPageContent(full.content || null);
			} catch (err) {
				if (!mounted) return;
				setAuthError(err?.message || 'Failed to load preview');
			} finally {
				if (mounted) setIsLoading(false);
			}
		};
		load();
		return () => {
			mounted = false;
		};
		}, [username, site, targetKey, loading, user, searchParams]);

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

	const frameData = typeof pageContent === 'string' ? pageContent : JSON.stringify(pageContent);

	return (
			<div className="min-h-screen bg-white">
				<div className="w-full overflow-auto">
					<Editor
					resolver={{
						Box,
						FlexBox,
						Text,
						GridBox,
						Image,
						Button,
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
										<Frame data={frameData} className="w-full">
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

