"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { WalletMultiButton } from "../../components/WalletMultiButton";
import dynamic from "next/dynamic";

// Dynamic import for performance
const BondingCurveChart = dynamic(() => import("../../components/BondingCurveChart").then(mod => ({ default: mod.BondingCurveChart })), { ssr: false });
import { useConnection } from "@solana/wallet-adapter-react";
import { 
  createBetFunClient,
  solToLamports 
} from "@betfun/sdk";
import { ARENA_LIMITS } from "../../lib/constants";
import Link from "next/link";

const STEPS = ["Details", "Outcomes", "Settings"];

export default function CreateArenaPage() {
  const router = useRouter();
  const walletContext = useWallet();
  const { connected, publicKey } = walletContext;
  const { connection } = useConnection();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [creating, setCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    question: "",
    outcomes: ["Yes", "No"],
    tags: [] as string[],
    entryFee: 0.05,
    endDate: "",
    endTime: "",
    manualResolve: false,
    launchToken: false,
    tokenName: "",
    tokenSymbol: "",
  });

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!formData.title || formData.title.length > ARENA_LIMITS.MAX_TITLE_LENGTH) {
        newErrors.title = `Title required (max ${ARENA_LIMITS.MAX_TITLE_LENGTH} chars)`;
      }
      if (formData.description.length > ARENA_LIMITS.MAX_DESCRIPTION_LENGTH) {
        newErrors.description = `Description too long (max ${ARENA_LIMITS.MAX_DESCRIPTION_LENGTH} chars)`;
      }
      if (!formData.question) {
        newErrors.question = "Question required";
      }
    }

    if (step === 1) {
      if (formData.outcomes.length < ARENA_LIMITS.MIN_OUTCOMES) {
        newErrors.outcomes = `At least ${ARENA_LIMITS.MIN_OUTCOMES} outcomes required`;
      }
      if (formData.outcomes.length > ARENA_LIMITS.MAX_OUTCOMES) {
        newErrors.outcomes = `Maximum ${ARENA_LIMITS.MAX_OUTCOMES} outcomes`;
      }
      if (formData.outcomes.some((o) => !o.trim())) {
        newErrors.outcomes = "All outcomes must have a value";
      }
    }

    if (step === 2) {
      if (formData.entryFee < ARENA_LIMITS.MIN_ENTRY_FEE || formData.entryFee > ARENA_LIMITS.MAX_ENTRY_FEE) {
        newErrors.entryFee = `Entry fee must be between ${ARENA_LIMITS.MIN_ENTRY_FEE}-${ARENA_LIMITS.MAX_ENTRY_FEE} SOL`;
      }
      if (!formData.manualResolve && (!formData.endDate || !formData.endTime)) {
        newErrors.endTime = "End date and time required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleCreate = async () => {
    if (!validateStep(currentStep) || !connected || !publicKey) return;

    setCreating(true);
    try {
      if (!publicKey || !connected) {
        throw new Error("Wallet not connected");
      }

      // Convert end date/time to Unix timestamp
      const endDateTime = formData.manualResolve
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
        : new Date(`${formData.endDate}T${formData.endTime}`);
      const endTimeUnix = Math.floor(endDateTime.getTime() / 1000);

      // Create BetFun client - pass the full wallet context, not just the wallet adapter
      const client = createBetFunClient(connection, walletContext);

      // Create arena using client
      const { signature, arenaPDA } = await client.createArena({
          title: formData.title,
          description: formData.description,
          question: formData.question,
          outcomes: formData.outcomes,
          tags: formData.tags,
          entryFee: solToLamports(formData.entryFee),
          endTime: endTimeUnix,
          manualResolve: formData.manualResolve,
        oracle: null,
        tokenMint: null,
      });

      console.log("Arena created:", arenaPDA.toString());
      console.log("Transaction:", signature);

      // Launch token on Indie.fun if requested
      if (formData.launchToken && publicKey) {
        try {
          const { launchToken } = await import("../../lib/indie-fun/tokenLaunch");
          const tokenData = await launchToken({
            name: formData.tokenName || formData.title,
            symbol: formData.tokenSymbol || formData.title.substring(0, 4).toUpperCase(),
            description: formData.description || formData.question,
            creatorWallet: publicKey.toString(),
            arenaId: arenaPDA.toString(),
            supply: 1000000000, // 1 billion tokens default
            decimals: 9,
          });
          console.log("Token launched on Indie.fun:", tokenData);
          
          // Update arena with token mint (if needed)
          // Note: This would require updating the arena account, which may need a separate transaction
        } catch (error) {
          console.error("Failed to launch token on Indie.fun:", error);
          // Don't block arena creation if token launch fails
          alert("Arena created successfully, but token launch failed. You can retry later.");
        }
      }

      // Show success message
      alert(`Arena created successfully! Transaction: ${signature}`);

      // Redirect to arena page
      router.push(`/arena/${arenaPDA.toString()}`);
    } catch (error: any) {
      console.error("Error creating arena:", error);
      const { formatErrorForDisplay } = await import("@/lib/errorHandler");
      const errorInfo = formatErrorForDisplay(error);
      alert(`${errorInfo.title}: ${errorInfo.message}`);
    } finally {
      setCreating(false);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-md">
        <div className="text-6xl mb-lg">🔒</div>
        <h1 className="text-h1 font-bold mb-md">Connect Wallet</h1>
        <p className="text-body text-light-gray mb-lg text-center max-w-md">
          You need to connect your wallet to create an arena
        </p>
        <WalletMultiButton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark-gray/95 backdrop-blur-sm border-b border-medium-gray">
        <div className="container mx-auto px-md py-sm flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">⚔️</span>
            <span className="text-h3 font-bold">Create Arena</span>
          </Link>
          <WalletMultiButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-md py-lg max-w-4xl">
        {/* Stepper */}
        <div className="mb-3xl">
          <div className="flex items-center justify-center gap-md mb-lg">
            {STEPS.map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold ${
                    index < currentStep
                      ? "bg-neon-green border-neon-green text-black"
                      : index === currentStep
                      ? "bg-electric-purple border-electric-purple text-white"
                      : "bg-transparent border-medium-gray text-light-gray"
                  }`}
                >
                  {index < currentStep ? "✓" : index + 1}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-20 h-1 mx-2 ${
                      index < currentStep ? "bg-neon-green" : "bg-medium-gray"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-body-large font-bold text-electric-purple">
            {STEPS[currentStep]}
          </p>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-lg">
              {/* Step 1: Details */}
              {currentStep === 0 && (
                <div className="space-y-lg">
                  <div>
                    <label className="block text-body font-bold mb-sm">
                      Arena Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="Will Trump tweet today?"
                      className="input-field w-full"
                      maxLength={ARENA_LIMITS.MAX_TITLE_LENGTH}
                    />
                    {errors.title && (
                      <p className="text-error text-body-small mt-xs">{errors.title}</p>
                    )}
                    <p className="text-body-small text-light-gray mt-xs">
                      {formData.title.length}/{ARENA_LIMITS.MAX_TITLE_LENGTH}
                    </p>
                  </div>

                  <div>
                    <label className="block text-body font-bold mb-sm">
                      Description (optional)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Add context to your prediction..."
                      className="input-field w-full h-32 resize-none"
                      maxLength={ARENA_LIMITS.MAX_DESCRIPTION_LENGTH}
                    />
                    <p className="text-body-small text-light-gray mt-xs">
                      {formData.description.length}/{ARENA_LIMITS.MAX_DESCRIPTION_LENGTH}
                    </p>
                  </div>

                  <div>
                    <label className="block text-body font-bold mb-sm">
                      Question *
                    </label>
                    <input
                      type="text"
                      value={formData.question}
                      onChange={(e) =>
                        setFormData({ ...formData, question: e.target.value })
                      }
                      placeholder="Will Trump tweet today?"
                      className="input-field w-full"
                    />
                    {errors.question && (
                      <p className="text-error text-body-small mt-xs">{errors.question}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-body font-bold mb-sm">Tags</label>
                    <input
                      type="text"
                      placeholder="Add tags (comma separated)"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.currentTarget.value) {
                          const tag = e.currentTarget.value.trim();
                          if (tag && formData.tags.length < ARENA_LIMITS.MAX_TAGS) {
                            setFormData({
                              ...formData,
                              tags: [...formData.tags, tag],
                            });
                            e.currentTarget.value = "";
                          }
                        }
                      }}
                      className="input-field w-full"
                    />
                    <div className="flex flex-wrap gap-xs mt-sm">
                      {formData.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 rounded-sm bg-electric-purple/20 text-electric-purple text-body-small flex items-center gap-2"
                        >
                          #{tag}
                          <button
                            onClick={() =>
                              setFormData({
                                ...formData,
                                tags: formData.tags.filter((_, idx) => idx !== i),
                              })
                            }
                            className="hover:text-white"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Outcomes */}
              {currentStep === 1 && (
                <div className="space-y-lg">
                  <div>
                    <label className="block text-body font-bold mb-sm">
                      Possible Outcomes ({formData.outcomes.length}/{ARENA_LIMITS.MAX_OUTCOMES})
                    </label>
                    {errors.outcomes && (
                      <p className="text-error text-body-small mb-sm">{errors.outcomes}</p>
                    )}
                    <div className="space-y-sm">
                      {formData.outcomes.map((outcome, index) => (
                        <div key={index} className="flex items-center gap-sm">
                          <input
                            type="text"
                            value={outcome}
                            onChange={(e) => {
                              const newOutcomes = [...formData.outcomes];
                              newOutcomes[index] = e.target.value;
                              setFormData({ ...formData, outcomes: newOutcomes });
                            }}
                            placeholder={`Outcome ${index + 1}`}
                            className="input-field flex-1"
                          />
                          {formData.outcomes.length > ARENA_LIMITS.MIN_OUTCOMES && (
                            <Button
                              variant="danger"
                              size="icon"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  outcomes: formData.outcomes.filter(
                                    (_, i) => i !== index
                                  ),
                                });
                              }}
                            >
                              🗑️
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    {formData.outcomes.length < ARENA_LIMITS.MAX_OUTCOMES && (
                      <Button
                        variant="secondary"
                        className="mt-sm w-full"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            outcomes: [...formData.outcomes, ""],
                          })
                        }
                      >
                        + Add Outcome
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Settings */}
              {currentStep === 2 && (
                <div className="space-y-lg">
                  <div>
                    <label className="block text-body font-bold mb-sm">
                      Entry Fee (SOL) *
                    </label>
                    <input
                      type="number"
                      value={formData.entryFee}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          entryFee: parseFloat(e.target.value),
                        })
                      }
                      min={ARENA_LIMITS.MIN_ENTRY_FEE}
                      max={ARENA_LIMITS.MAX_ENTRY_FEE}
                      step={0.01}
                      className="input-field w-full"
                    />
                    {errors.entryFee && (
                      <p className="text-error text-body-small mt-xs">{errors.entryFee}</p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.manualResolve}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            manualResolve: e.target.checked,
                          })
                        }
                        className="w-5 h-5"
                      />
                      <span className="text-body font-bold">Manual Resolution</span>
                    </label>
                    <p className="text-body-small text-light-gray mt-xs ml-7">
                      You decide when to resolve (no end time)
                    </p>
                  </div>

                  {!formData.manualResolve && (
                    <div className="grid grid-cols-2 gap-md">
                      <div>
                        <label className="block text-body font-bold mb-sm">
                          End Date *
                        </label>
                        <input
                          type="date"
                          value={formData.endDate}
                          onChange={(e) =>
                            setFormData({ ...formData, endDate: e.target.value })
                          }
                          min={new Date().toISOString().split("T")[0]}
                          className="input-field w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-body font-bold mb-sm">
                          End Time *
                        </label>
                        <input
                          type="time"
                          value={formData.endTime}
                          onChange={(e) =>
                            setFormData({ ...formData, endTime: e.target.value })
                          }
                          className="input-field w-full"
                        />
                      </div>
                    </div>
                  )}

                  <div className="border-t border-medium-gray pt-lg">
                    <label className="flex items-center gap-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.launchToken}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            launchToken: e.target.checked,
                          })
                        }
                        className="w-5 h-5"
                      />
                      <span className="text-body font-bold">
                        🚀 Launch Token on Indie.fun?
                      </span>
                    </label>
                    <p className="text-body-small text-light-gray mt-xs ml-7">
                      Create a bonding curve token and earn 5% perpetual fees
                    </p>

                    {formData.launchToken && (
                      <div className="mt-md ml-7 space-y-md">
                        <input
                          type="text"
                          value={formData.tokenName}
                          onChange={(e) =>
                            setFormData({ ...formData, tokenName: e.target.value })
                          }
                          placeholder="Token Name"
                          className="input-field w-full"
                        />
                        <input
                          type="text"
                          value={formData.tokenSymbol}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              tokenSymbol: e.target.value.toUpperCase(),
                            })
                          }
                          placeholder="Symbol (e.g., TRUMP)"
                          className="input-field w-full"
                          maxLength={10}
                        />
                        
                        {/* Bonding Curve Preview - USERFLOW.md spec */}
                        <div className="mt-md">
                          <p className="text-body-small text-light-gray mb-sm">
                            You earn 5% of all fees forever
                          </p>
                          <BondingCurveChart projectedRaise={69420} type="linear" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-3xl pt-lg border-t border-medium-gray">
                {currentStep > 0 && (
                  <Button variant="secondary" onClick={handlePrevious}>
                    ← Previous
                  </Button>
                )}
                {currentStep < STEPS.length - 1 ? (
                  <Button onClick={handleNext} className="ml-auto">
                    Next →
                  </Button>
                ) : (
                  <Button
                    variant="success"
                    onClick={handleCreate}
                    disabled={creating}
                    className="ml-auto"
                  >
                    {creating && <span className="spinner w-5 h-5 mr-2" />}
                    {creating ? "Creating..." : "CREATE ARENA ⚔️"}
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

