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
      <div className="rounded-xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm sm:p-5 lg:rounded-2xl lg:p-6">
        <h2 className="mb-4 text-lg font-semibold tracking-tight sm:text-xl lg:mb-6">
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
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg ring-2 shadow-orange-500/30 ring-orange-500/20 lg:h-10 lg:w-10">
                        <CheckCircle2 className="h-4 w-4 text-white lg:h-5 lg:w-5" />
                      </div>
                    ) : isCurrent ? (
                      <div className="flex h-8 w-8 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg ring-4 shadow-orange-500/30 ring-orange-500/20 lg:h-10 lg:w-10">
                        <span className="text-sm font-bold text-white lg:text-base">
                          {step.number}
                        </span>
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border/50 bg-muted lg:h-10 lg:w-10">
                        <span className="text-xs font-semibold text-muted-foreground lg:text-sm">
                          {step.number}
                        </span>
                      </div>
                    )}

                    {/* Connector line */}
                    {index < steps.length - 1 && (
                      <div className="absolute top-8 left-4 -ml-px h-5 w-px lg:top-10 lg:left-5 lg:h-6">
                        <div
                          className={`h-full w-full transition-all duration-500 ${
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
                      className={`text-sm font-medium transition-colors duration-200 lg:text-base ${
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
                      <div className="mt-1 flex items-center gap-1.5 text-orange-600 lg:mt-1.5">
                        <ArrowRight className="h-3 w-3 animate-pulse lg:h-3.5 lg:w-3.5" />
                        <span className="text-xs font-medium">In progress</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 border-t border-border/50 pt-4 lg:mt-6 lg:pt-6">
          <p className="flex items-center gap-2 text-xs text-muted-foreground/70 sm:text-sm">
            <Circle className="h-3 w-3 flex-shrink-0 lg:h-3.5 lg:w-3.5" />
            <span>You can delete this site anytime.</span>
          </p>
        </div>
      </div>

      {/* Why we need this */}
      <div className="rounded-xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-orange-500/[0.02] p-4 sm:p-5 lg:rounded-2xl lg:p-6">
        <h3 className="mb-3 text-base font-semibold tracking-tight text-orange-600 sm:text-lg lg:mb-4">
          Why we need this
        </h3>
        <ul className="space-y-2.5 lg:space-y-3">
          <li className="group flex items-start gap-2.5 lg:gap-3">
            <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500 transition-transform group-hover:scale-125 lg:mt-2" />
            <span className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              We use your site URL to attribute events
            </span>
          </li>
          <li className="group flex items-start gap-2.5 lg:gap-3">
            <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500 transition-transform group-hover:scale-125 lg:mt-2" />
            <span className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              No cookies or personal data are collected
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
