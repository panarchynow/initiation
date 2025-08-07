import { ConfigurableForm } from "@/components/form/ConfigurableForm";
import { corporateFormConfig } from "@/lib/config/forms/corporateForm.config";
import { participantFormConfig } from "@/lib/config/forms/participantForm.config";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TestNetworkPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 md:px-6 lg:max-w-4xl">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              Network Selection Test
            </h1>
            <p className="text-muted-foreground">
              Test Stellar network selection functionality
            </p>
          </div>
          
          <Tabs defaultValue="corporate" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="corporate">Corporate Form</TabsTrigger>
              <TabsTrigger value="participant">Participant Form</TabsTrigger>
            </TabsList>
            
            <TabsContent value="corporate" className="mt-6">
              <div className="form-container">
                <ConfigurableForm 
                  config={corporateFormConfig}
                  className="corporate-form"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="participant" className="mt-6">
              <div className="form-container">
                <ConfigurableForm 
                  config={participantFormConfig}
                  className="participant-form"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
}
