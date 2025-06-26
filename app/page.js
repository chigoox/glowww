'use client'
import { useState } from 'react';

import { Toolbox } from './Components/ToolBox';
import { Topbar } from './Components/TopBar';

import { Editor, Element, Frame } from "@craftjs/core";
import { Box } from './Components/user/Box';
import { StyleMenu } from './Components/StyleMenu';
import { FlexBox } from './Components/user/FlexBox';

export default function App() {
  const [openMenuNodeId, setOpenMenuNodeId] = useState(null);

  return (
    <div className="mx-auto  p-4">
      <Editor resolver={{Box, FlexBox}}> 
      <div className="pt-2 space-y-2">
        <Topbar />

        <div className="flex-row-reverse  flex gap-4">
          {/* Main Content */}
          <StyleMenu />

         <div className=' w-full h-full'>
            <Frame className='w-full'>
              <Element is={Box} padding={5} background="#eee" 
                    canvas
              >
              
              
              </Element>
            </Frame>
         </div>

          {/* Sidebar */}
          <div className="w-32">
            <div className="bg-white rounded shadow p-2 space-y-4">
              <Toolbox openMenuNodeId={openMenuNodeId}
                  setOpenMenuNodeId={setOpenMenuNodeId} />
              
            </div>

          </div>

        </div>
      </div>
       </Editor>
    </div>
  );
}