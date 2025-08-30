"use client";

import React from 'react';
import { Editor, Frame } from '@craftjs/core';
import { Box } from '../../app/Components/user/Layout/Box';
import { FlexBox } from '../../app/Components/user/Layout/FlexBox';
import { Text } from '../../app/Components/user/Text/Text';
import { GridBox } from '../../app/Components/user/Layout/GridBox';
import { Image } from '../../app/Components/user/Media/Image';
import { Button } from '../../app/Components/user/Interactive/Button';
import { Link as UserLink } from '../../app/Components/user/Interactive/Link';
import { Paragraph } from '../../app/Components/user/Text/Paragraph';
import { Video } from '../../app/Components/user/Media/Video';
import { ShopFlexBox, ShopImage, ShopText } from '../../app/Components/user/Advanced/ShopFlexBox';
import { FormInput } from '../../app/Components/user/Input';
import { Form, FormInputDropArea } from '../../app/Components/user/Advanced/Form';
import { Carousel } from '../../app/Components/user/Media/Carousel';
import { NavBar, NavItem } from '../../app/Components/user/Nav/NavBar';
import { Root } from '../../app/Components/core/Root';
import { PagesProvider } from '../../app/Components/utils/context/PagesContext';

// Minimal blank project data (single empty home page)
const blankProjectData = JSON.stringify({
  ROOT: {
    type: { resolvedName: 'Element' },
    isCanvas: true,
    props: {},
    displayName: 'Element',
    custom: {},
    hidden: false,
    nodes: [],
    linkedNodes: {}
  }
});

export default function BlankPreview() {
  return (
    <div className="w-full">
      <PagesProvider>
        <Editor resolver={{
          Box, FlexBox, Text, GridBox, Image, Button, UserLink, Paragraph, Video,
          ShopFlexBox, ShopImage, ShopText, FormInput, Form, FormInputDropArea, Carousel, NavBar, NavItem, Root
        }} enabled={false}>
          <Frame data={blankProjectData} className="w-full min-h-[420px] md:min-h-[600px] border border-gray-200 rounded-xl overflow-hidden" />
        </Editor>
      </PagesProvider>
    </div>
  );
}
