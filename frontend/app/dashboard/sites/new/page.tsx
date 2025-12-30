"use client";

import { NewSiteForm } from "@/components/sites/new-site-form";
import { StepProgress } from "@/components/sites/step-progress";
import { TrackingSnippet } from "@/components/sites/tracking-snippet";
import { RealtimeAnalytics } from "@/components/sites/realtime-analytics";
import { useState } from "react";

export default function NewSitePage() {
  const [currentStep, setCurrentStep] = useState(1);

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Add your site";
      case 2:
        return "Install tracking snippet";
      case 3:
        return "View analytics";
      default:
        return "Add your site";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1:
        return "Add your website to start collecting analytics data.";
      case 2:
        return "Copy and paste this tracking snippet into your website.";
      case 3:
        return "View real-time analytics for your website.";
      default:
        return "Add your website to start collecting analytics data.";
    }
  };

  return (
    <div className="w-full h-full">
      <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 h-full">
          {/* Left side - Header + Form */}
          <div className="flex-1 min-w-0 space-y-6 lg:space-y-8">
            {/* Header */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-3">
                <span className="text-xs sm:text-sm font-medium text-primary">
                  Step {currentStep} of 3 · {getStepTitle()}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                Add a new Site
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {getStepDescription()}
              </p>
            </div>

            {/* Main Content - Form/Components */}
            <div className="transition-all duration-300 ease-in-out">
              {currentStep === 1 && (
                <NewSiteForm onStepChange={setCurrentStep} />
              )}
              {currentStep === 2 && (
                <TrackingSnippet onStepChange={setCurrentStep} />
              )}
              {currentStep === 3 && <RealtimeAnalytics />}
            </div>
          </div>

          {/* Right side - Progress */}
          <div className="w-full lg:w-96 shrink-0">
            <StepProgress currentStep={currentStep} />
          </div>
        </div>
      </div>
    </div>
  );
}
