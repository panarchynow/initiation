import type { Metadata } from "next";
import CorporateForm from "@/components/CorporateForm";
import PersonalForm from "@/components/PersonalForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Corporate Data Form - Stellar Integration",
  description: "Corporate data form with Stellar blockchain integration",
};

export default function CorporatePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 md:px-6 lg:max-w-4xl">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-primary">Stellar Data Forms</h1>
            <p className="text-muted-foreground">
              Submit your information to the Stellar blockchain
            </p>
          </div>
          
          <Tabs defaultValue="corporate" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personal" asChild>
                <Link href="/participant">Personal Data</Link>
              </TabsTrigger>
              <TabsTrigger value="corporate" asChild>
                <Link href="/corporate">Corporate Data</Link>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="personal" className="mt-6">
              <div className="form-container">
                <PersonalForm />
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