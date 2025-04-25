import type { Metadata } from "next";
import CorporateForm from "@/components/CorporateForm";
import ParticipantForm from "@/components/ParticipantForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Montelibero Initiation | Corporate Data",
  description: "Corporate data form with Stellar blockchain integration",
};

export default function CorporatePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 md:px-6 lg:max-w-4xl">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-primary">Montelibero Initiation</h1>
            <p className="text-muted-foreground">
              Submit your information to the Stellar blockchain
            </p>
          </div>
          
          <Tabs defaultValue="corporate" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personal" asChild>
                <Link href="/participant">Participant Data</Link>
              </TabsTrigger>
              <TabsTrigger value="corporate" asChild>
                <Link href="/corporate">Corporate Data</Link>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="personal" className="mt-6">
              <div className="form-container">
                <ParticipantForm />
              </div>
            </TabsContent>
            
            <TabsContent value="corporate" className="mt-6">
              <div className="form-container">
                <CorporateForm />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
} 