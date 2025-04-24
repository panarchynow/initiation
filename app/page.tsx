import { Metadata } from "next";
import CorporateForm from "@/components/CorporateForm";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Corporate Form - Stellar Integration",
  description: "Corporate form with Stellar blockchain integration for data management",
};

export default function Home() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <main className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4 md:px-6 lg:max-w-4xl">
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-bold tracking-tight text-primary">Corporate Data Form</h1>
              <p className="text-muted-foreground">
                Submit your corporate information to the Stellar blockchain
              </p>
            </div>
            <div className="form-container">
              <CorporateForm />
            </div>
          </div>
        </div>
      </main>
    </ThemeProvider>
  );
}