import { Card, Grid, } from "antd";
import Image from "next/image";
import { Topbar } from "./Componets/TopBar";
import { Container } from "./Componets/user/Container";
import { Toolbox } from "./Componets/ToolBox";
import { SettingsPanel } from "./Componets/SettingsPanel";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
         <div className="grid">
        <Topbar />
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <Container padding={5} background="#eee">
            <Card />
          </Container>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
              <Toolbox />
              <SettingsPanel />
          </Card>          
        </div>
      </div>
      </main>
       
    </div>
  );
}
