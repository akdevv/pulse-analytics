import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

interface StepProgressProps {
  currentStep: number;
}

export function StepProgress({ currentStep }: StepProgressProps) {
  const steps = [
    { number: 1, label: "Add your site" },
    { number: 2, label: "Install the tracking snippet" },
    { number: 3, label: "View real-time analytics" },
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* What happens next */}
      <div className="rounded-xl lg:rounded-2xl border border-border/50 bg-card/50 p-4 sm:p-5 lg:p-6 backdrop-blur-sm">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 lg:mb-6 tracking-tight">
          What happens next
        </h2>
        <div className="space-y-3 lg:space-y-4">
          {steps.map((step, index) => {
            const isCompleted = step.number < currentStep;
            const isCurrent = step.number === currentStep;
            const isUpcoming = step.number > currentStep;

            return (
              <div key={step.number} className="relative">
                <div className="flex items-start gap-3 lg:gap-4">
                  <div className="relative flex-shrink-0">
                    {isCompleted ? (
                      <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30 ring-2 ring-orange-500/20">
                        <CheckCircle2 className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                      </div>
                    ) : isCurrent ? (
                      <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30 ring-4 ring-orange-500/20 animate-pulse">
                        <span className="text-sm lg:text-base font-bold text-white">
                          {step.number}
                        </span>
                      </div>
                    ) : (
                      <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center bg-muted border-2 border-border/50">
                        <span className="text-xs lg:text-sm font-semibold text-muted-foreground">
                          {step.number}
                        </span>
                      </div>
                    )}

                    {/* Connector line */}
                    {index < steps.length - 1 && (
                      <div className="absolute left-4 lg:left-5 top-8 lg:top-10 w-px h-5 lg:h-6 -ml-px">
                        <div
                          className={`w-full h-full transition-all duration-500 ${
                            isCompleted
                              ? "bg-gradient-to-b from-orange-500 to-orange-400"
                              : "bg-border/30"
                          }`}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 pt-1 lg:pt-2">
                    <p
                      className={`text-sm lg:text-base font-medium transition-colors duration-200 ${
                        isCurrent
                          ? "text-foreground"
                          : isCompleted
                            ? "text-muted-foreground/80"
                            : "text-muted-foreground/60"
                      }`}
                    >
                      {step.label}
                    </p>
                    {isCurrent && (
                      <div className="flex items-center gap-1.5 mt-1 lg:mt-1.5 text-orange-600">
                        <ArrowRight className="w-3 h-3 lg:w-3.5 lg:h-3.5 animate-pulse" />
                        <span className="text-xs font-medium">In progress</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 lg:mt-6 pt-4 lg:pt-6 border-t border-border/50">
          <p className="text-xs sm:text-sm text-muted-foreground/70 flex items-center gap-2">
            <Circle className="w-3 h-3 lg:w-3.5 lg:h-3.5 flex-shrink-0" />
            <span>You can delete this site anytime.</span>
          </p>
        </div>
      </div>

      {/* Why we need this */}
      <div className="rounded-xl lg:rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-orange-500/[0.02] p-4 sm:p-5 lg:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-orange-600 mb-3 lg:mb-4 tracking-tight">
          Why we need this
        </h3>
        <ul className="space-y-2.5 lg:space-y-3">
          <li className="flex items-start gap-2.5 lg:gap-3 group">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 lg:mt-2 flex-shrink-0 group-hover:scale-125 transition-transform" />
            <span className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              We use your site URL to attribute events
            </span>
          </li>
          <li className="flex items-start gap-2.5 lg:gap-3 group">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 lg:mt-2 flex-shrink-0 group-hover:scale-125 transition-transform" />
            <span className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              No cookies or personal data are collected
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
