"use client";

import React, { useRef, useCallback, useEffect } from "react";
import {
  motion,
  useTransform,
  useSpring,
  AnimatePresence,
} from "motion/react";
import { HeaderBar } from "../HeaderBar";
import { VerbioLogo } from "../VerbioLogo";
import { VoiceInputDisplay } from "../VoiceInputDisplay";
import { TranslationResult } from "../TranslationResult";
import { ListeningOrb } from "../ListeningOrb";
import { LanguageSelector } from "../LanguageSelector";
import { AudioControls } from "../AudioControls";
import { BottomInput } from "../BottomInput";
import { TipsPopup } from "../TipsPopup";
import { ImageUploadDialog } from "../ImageUploadDialog";
import { LoadingOverlays } from "../LoadingOverlays";
import { ErrorDisplay } from "../ErrorDisplay";
import { PermissionRequestBanner } from "../PermissionRequestBanner";
import { SpeechRecognition } from "../SpeechRecognition";
import { AudioRecorder } from "../AudioRecorder";
import { MicrophonePermissionGuide } from "../MicrophonePermissionGuide";
import { useAppContext } from "../../context/AppContext";
import { useTranslation } from "../../hooks/useTranslation";
import { useSpeech } from "../../hooks/useSpeech";
import { useConversation } from "../../hooks/useConversation";
import { useAnalytics } from "../../hooks/useAnalytics";
import { TranslationService } from "../../services/translationService";
import { User } from "../../types";

interface MainPageProps {
  onPageChange: (page: "signin" | "settings") => void;
}

export function MainPage({ onPageChange }: MainPageProps) {
  const { state, dispatch } = useAppContext();
  const {
    isListening,
    fromLanguage,
    toLanguage,
    showTips,
    user,
    currentConversation,
    isProcessing,
    conversationMode,
    showImageUpload,
    isVoiceInput,
    extractingText,
    speechRecognitionText,
    speechError,
    isRecordingAudio,
    showMicrophoneGuide,
    showPermissionBanner,
  } = state;

  const lastProcessedRef = useRef<string>("");
  const springConfig = {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  };
  const x = useSpring(0, springConfig);
  const y = useSpring(0, springConfig);
  const orbTransformX = useTransform(x, [-10, 10], [-5, 5]);
  const orbTransformY = useTransform(y, [-10, 10], [-3, 3]);

  const { trackAnalytics } = useAnalytics(user?.id);

  // Translation hook
  const { performTranslation } = useTranslation({
    fromLanguage,
    toLanguage,
    conversationMode,
    currentConversation,
    setCurrentConversation: (conversation) =>
      dispatch({
        type: "SET_CURRENT_CONVERSATION",
        payload:
          typeof conversation === "function"
            ? conversation(currentConversation)
            : conversation,
      }),
    setIsProcessing: (processing) =>
      dispatch({
        type: "SET_IS_PROCESSING",
        payload: processing,
      }),
    user,
    lastProcessedRef,
  });

  // Speech hook
  const speechHandlers = useSpeech({
    fromLanguage,
    conversationMode,
    isListening,
    performTranslation,
    setSpeechRecognitionText: (text) =>
      dispatch({
        type: "SET_SPEECH_RECOGNITION_TEXT",
        payload: text,
      }),
    setSpeechError: (error) =>
      dispatch({ type: "SET_SPEECH_ERROR", payload: error }),
    setIsListening: (listening) =>
      dispatch({
        type: "SET_IS_LISTENING",
        payload: listening,
      }),
    setIsVoiceInput: (voiceInput) =>
      dispatch({
        type: "SET_IS_VOICE_INPUT",
        payload: voiceInput,
      }),
    setIsRecordingAudio: (recording) =>
      dispatch({
        type: "SET_IS_RECORDING_AUDIO",
        payload: recording,
      }),
    setShowMicrophoneGuide: (show) =>
      dispatch({
        type: "SET_SHOW_MICROPHONE_GUIDE",
        payload: show,
      }),
    userId: user?.id,
  });

  // Conversation hook
  const conversationHandlers = useConversation({
    currentConversation,
    setCurrentConversation: (conversation) =>
      dispatch({
        type: "SET_CURRENT_CONVERSATION",
        payload:
          typeof conversation === "function"
            ? conversation(currentConversation)
            : conversation,
      }),
    conversationMode,
    setConversationMode: (mode) =>
      dispatch({
        type: "SET_CONVERSATION_MODE",
        payload: mode,
      }),
    performTranslation,
    setIsProcessing: (processing) =>
      dispatch({
        type: "SET_IS_PROCESSING",
        payload: processing,
      }),
    lastProcessedRef,
    userId: user?.id,
  });

  // Check for microphone permission on component mount
  useEffect(() => {
    const checkMicrophonePermission = async () => {
      try {
        if (navigator.permissions) {
          const result = await navigator.permissions.query({
            name: "microphone" as PermissionName,
          });

          if (result.state === "prompt") {
            // Show permission banner if permission hasn't been requested yet
            dispatch({
              type: "SET_SHOW_PERMISSION_BANNER",
              payload: true,
            });
          }

          // Listen for permission changes
          result.addEventListener("change", () => {
            if (result.state === "denied") {
              dispatch({
                type: "SET_SHOW_PERMISSION_BANNER",
                payload: false,
              });
              dispatch({
                type: "SET_SPEECH_ERROR",
                payload:
                  "Microphone permission denied. Please enable it to use voice features.",
              });
            } else if (result.state === "granted") {
              dispatch({
                type: "SET_SHOW_PERMISSION_BANNER",
                payload: false,
              });
              dispatch({
                type: "SET_SPEECH_ERROR",
                payload: null,
              });
            }
          });
        }
      } catch (error) {
        console.log("Permissions API not supported:", error);
      }
    };

    checkMicrophonePermission();
  }, [dispatch]);

  // Mouse movement handler
  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      const { clientX, clientY } = event;
      const { innerWidth, innerHeight } = window;

      const xPct = (clientX / innerWidth - 0.5) * 2;
      const yPct = (clientY / innerHeight - 0.5) * 2;

      x.set(xPct * 8);
      y.set(yPct * 8);
    },
    [x, y],
  );

  // Voice input handler
  const handleVoiceInput = useCallback(async () => {
    if (isVoiceInput || isListening || isRecordingAudio) {
      console.log("Stopping voice input...");
      dispatch({ type: "SET_IS_VOICE_INPUT", payload: false });
      dispatch({
        type: "SET_IS_RECORDING_AUDIO",
        payload: false,
      });
      dispatch({ type: "SET_IS_LISTENING", payload: false });
      dispatch({
        type: "SET_SPEECH_RECOGNITION_TEXT",
        payload: "",
      });
      dispatch({ type: "SET_SPEECH_ERROR", payload: null });

      trackAnalytics("voice_input_stopped", {
        wasRecording: isRecordingAudio,
        wasListening: isListening,
      });
    } else {
      console.log("Starting voice input...");

      // Check microphone permission first
      try {
        const stream =
          await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
        stream.getTracks().forEach((track) => track.stop()); // Clean up

        // Permission granted, proceed with voice input
        dispatch({ type: "SET_SPEECH_ERROR", payload: null });
        dispatch({
          type: "SET_SHOW_PERMISSION_BANNER",
          payload: false,
        });

        // Clear conversation if not in conversation mode
        if (!conversationMode) {
          conversationHandlers.handleClearConversation();
        }

        // Start voice input
        dispatch({ type: "SET_IS_VOICE_INPUT", payload: true });
        dispatch({
          type: "SET_IS_RECORDING_AUDIO",
          payload: true,
        });

        trackAnalytics("voice_input_started", {
          conversationMode,
          language: fromLanguage,
        });
      } catch (error) {
        console.error("Microphone permission error:", error);
        dispatch({
          type: "SET_SHOW_PERMISSION_BANNER",
          payload: true,
        });

        let errorMessage = "Microphone access denied";
        if (error instanceof Error) {
          if (error.name === "NotAllowedError") {
            errorMessage =
              "Microphone permission denied. Please allow microphone access to use voice features.";
          } else if (error.name === "NotFoundError") {
            errorMessage =
              "No microphone found. Please connect a microphone and try again.";
          }
        }

        dispatch({
          type: "SET_SPEECH_ERROR",
          payload: errorMessage,
        });
        trackAnalytics("microphone_permission_denied", {
          error: errorMessage,
        });
      }
    }
  }, [
    isVoiceInput,
    isListening,
    isRecordingAudio,
    conversationMode,
    fromLanguage,
    conversationHandlers.handleClearConversation,
    trackAnalytics,
    dispatch,
  ]);

  // Image upload handler
  const handleImageUpload = useCallback(
    async (file: File) => {
      dispatch({ type: "SET_EXTRACTING_TEXT", payload: true });
      dispatch({
        type: "SET_SHOW_IMAGE_UPLOAD",
        payload: false,
      });

      try {
        const result = await TranslationService.translateImage(
          file,
          toLanguage,
        );

        dispatch({
          type: "SET_EXTRACTING_TEXT",
          payload: false,
        });

        // Create conversation message from OCR result
        const ocrMessage = {
          id: `ocr_${Date.now()}`,
          originalText: result.extractedText,
          translatedText: result.translatedText,
          fromLanguage: result.detectedLanguage,
          toLanguage: result.toLanguage,
          inputType: "image" as const,
          confidence: result.confidence,
          timestamp: new Date(),
          speaker: "user" as const,
        };

        const ocrConversation = {
          id: `ocr_conv_${Date.now()}`,
          title: `Image: ${ocrMessage.originalText.slice(0, 50)}...`,
          messages: [ocrMessage],
          isActive: false,
          isProcessing: false,
          startedAt: new Date(),
          lastActivityAt: new Date(),
          totalMessages: 1,
          avgConfidence: ocrMessage.confidence,
        };

        dispatch({
          type: "SET_CURRENT_CONVERSATION",
          payload: ocrConversation,
        });

        trackAnalytics("ocr_success", {
          fileSize: file.size,
          detectedLanguage: result.detectedLanguage,
          confidence: result.confidence,
          textLength: result.extractedText.length,
        });
      } catch (error) {
        console.error("Image OCR error:", error);
        dispatch({
          type: "SET_EXTRACTING_TEXT",
          payload: false,
        });

        trackAnalytics("ocr_error", {
          error:
            error instanceof Error
              ? error.message
              : "Unknown error",
          fileSize: file.size,
        });

        dispatch({
          type: "SET_SPEECH_ERROR",
          payload:
            error instanceof Error
              ? error.message
              : "Failed to process image. Please try again.",
        });
      }
    },
    [toLanguage, dispatch, trackAnalytics],
  );

  // Auto-stop voice input timeout
  useEffect(() => {
    if (isVoiceInput) {
      const timer = setTimeout(() => {
        console.log("Auto-stopping voice input after timeout");
        handleVoiceInput();
      }, 30000); // 30 seconds max

      return () => clearTimeout(timer);
    }
  }, [isVoiceInput, handleVoiceInput]);

  // Keyboard focus handler
  const handleKeyboardInput = useCallback(() => {
    const input = document.querySelector(
      'input[placeholder*="Type to translate"]',
    ) as HTMLInputElement;
    if (input) {
      input.focus();
      trackAnalytics("keyboard_input_focused");
    }
  }, [trackAnalytics]);

  // Microphone permission granted handler
  const handleMicrophonePermissionGranted = useCallback(() => {
    console.log(
      "Microphone permission granted, resetting states",
    );
    dispatch({
      type: "SET_SHOW_MICROPHONE_GUIDE",
      payload: false,
    });
    dispatch({
      type: "SET_SHOW_PERMISSION_BANNER",
      payload: false,
    });
    dispatch({ type: "SET_SPEECH_ERROR", payload: null });
    dispatch({ type: "SET_IS_VOICE_INPUT", payload: false });
    dispatch({
      type: "SET_IS_RECORDING_AUDIO",
      payload: false,
    });
    dispatch({ type: "SET_IS_LISTENING", payload: false });
    dispatch({
      type: "SET_SPEECH_RECOGNITION_TEXT",
      payload: "",
    });

    trackAnalytics("microphone_permission_granted");
    console.log(
      "✅ Microphone access granted! You can now use voice features.",
    );
  }, [dispatch, trackAnalytics]);

  // Permission denied handler
  const handleMicrophonePermissionDenied = useCallback(() => {
    console.log("Microphone permission denied");
    dispatch({
      type: "SET_SPEECH_ERROR",
      payload:
        "Microphone permission denied. Please enable microphone access in your browser settings to use voice features.",
    });
    trackAnalytics("microphone_permission_denied");
  }, [dispatch, trackAnalytics]);

  // Input placeholder
  const getInputPlaceholder = () => {
    if (extractingText)
      return "📸 Extracting text from image...";
    if (isVoiceInput || isListening)
      return "🎤 Recording audio...";
    if (isProcessing) return "⚡ Processing translation...";
    return "💬 Type to translate";
  };

  return (
    <div
      className="flex flex-col min-h-screen"
      onMouseMove={handleMouseMove}
    >
      {/* Permission Request Banner */}
      <PermissionRequestBanner
        isVisible={showPermissionBanner}
        onDismiss={() =>
          dispatch({
            type: "SET_SHOW_PERMISSION_BANNER",
            payload: false,
          })
        }
        onPermissionGranted={handleMicrophonePermissionGranted}
        onPermissionDenied={handleMicrophonePermissionDenied}
      />

      {/* Header */}
      <HeaderBar
        conversationMode={conversationMode}
        onToggleConversationMode={
          conversationHandlers.toggleConversationMode
        }
        onShowMicrophoneGuide={() =>
          dispatch({
            type: "SET_SHOW_MICROPHONE_GUIDE",
            payload: true,
          })
        }
        onShowTips={() =>
          dispatch({ type: "SET_SHOW_TIPS", payload: true })
        }
        onUserClick={() =>
          onPageChange(user ? "settings" : "signin")
        }
        user={user}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* App Logo */}
        <AnimatePresence>
          {!currentConversation &&
            !isListening &&
            !isVoiceInput && (
              <motion.div
                className="text-center mb-16"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30, scale: 0.9 }}
                transition={{
                  duration: 0.8,
                  delay: 0.2,
                  type: "spring",
                  stiffness: 80,
                }}
              >
                <VerbioLogo
                  isListening={isListening || isProcessing}
                  style={{ x, y }}
                  className="mb-6"
                />

                {user && (
                  <motion.p
                    className="text-white/70 text-lg mt-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                  >
                    Welcome back, {user.name}
                  </motion.p>
                )}

                {conversationMode && (
                  <motion.p
                    className="text-purple-300 text-sm mt-2 bg-white/10 rounded-full px-4 py-1 backdrop-blur-md"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.4 }}
                  >
                    🎯 Conversation Mode Active
                  </motion.p>
                )}
              </motion.div>
            )}
        </AnimatePresence>

        {/* Real-time Speech Recognition Display */}
        <AnimatePresence>
          {(isListening ||
            isVoiceInput ||
            speechRecognitionText) &&
            !currentConversation && (
              <VoiceInputDisplay
                isListening={isListening}
                isVoiceInput={isVoiceInput}
                speechRecognitionText={speechRecognitionText}
                onStop={() => {
                  dispatch({
                    type: "SET_IS_VOICE_INPUT",
                    payload: false,
                  });
                  dispatch({
                    type: "SET_IS_LISTENING",
                    payload: false,
                  });
                  dispatch({
                    type: "SET_IS_RECORDING_AUDIO",
                    payload: false,
                  });
                  dispatch({
                    type: "SET_SPEECH_RECOGNITION_TEXT",
                    payload: "",
                  });
                }}
              />
            )}
        </AnimatePresence>

        {/* Translation Result / Conversation */}
        <TranslationResult
          conversationData={currentConversation}
          conversationMode={conversationMode}
          fromLanguage={fromLanguage}
          toLanguage={toLanguage}
          onFromLanguageChange={(lang) => {
            dispatch({
              type: "SET_FROM_LANGUAGE",
              payload: lang,
            });
            if (!conversationMode) {
              conversationHandlers.handleClearConversation();
            }
          }}
          onToLanguageChange={(lang) => {
            dispatch({
              type: "SET_TO_LANGUAGE",
              payload: lang,
            });
            if (!conversationMode) {
              conversationHandlers.handleClearConversation();
            }
          }}
          onClear={conversationHandlers.handleClearConversation}
          onContinue={
            conversationHandlers.handleContinueConversation
          }
          onRetry={conversationHandlers.handleRetryLastMessage}
          onSave={conversationHandlers.handleSaveConversation}
          onNewTranslation={(text) => {
            if (text.trim() && !isProcessing) {
              performTranslation(text.trim(), "text");
            }
          }}
        />

        {/* 3D Listening Orb */}
        <motion.div
          className={`${currentConversation || isListening || isVoiceInput ? "mb-8" : "mb-16"}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: 1,
            scale:
              currentConversation || isListening || isVoiceInput
                ? 0.8
                : 1,
            y:
              currentConversation || isListening || isVoiceInput
                ? -20
                : 0,
          }}
          transition={{
            duration: 0.8,
            delay: 0.4,
            type: "spring",
            stiffness: 60,
            damping: 20,
          }}
          style={{ x: orbTransformX, y: orbTransformY }}
        >
          <ListeningOrb
            isListening={
              isListening || isVoiceInput || isProcessing
            }
          />
        </motion.div>

        {/* Language Selector */}
        <AnimatePresence>
          {!currentConversation &&
            !isListening &&
            !isVoiceInput &&
            !speechRecognitionText && (
              <motion.div
                className="w-full max-w-md mb-12"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30, scale: 0.9 }}
                transition={{
                  duration: 0.8,
                  delay: 0.6,
                  type: "spring",
                  stiffness: 100,
                }}
                whileHover={{
                  y: -5,
                  transition: { duration: 0.2 },
                }}
              >
                <LanguageSelector
                  fromLanguage={fromLanguage}
                  toLanguage={toLanguage}
                  onFromLanguageChange={(lang) => {
                    dispatch({
                      type: "SET_FROM_LANGUAGE",
                      payload: lang,
                    });
                    if (!conversationMode) {
                      conversationHandlers.handleClearConversation();
                    }
                  }}
                  onToLanguageChange={(lang) => {
                    dispatch({
                      type: "SET_TO_LANGUAGE",
                      payload: lang,
                    });
                    if (!conversationMode) {
                      conversationHandlers.handleClearConversation();
                    }
                  }}
                />
              </motion.div>
            )}
        </AnimatePresence>

        {/* Audio Controls */}
        <motion.div
          className={`${currentConversation || isListening || isVoiceInput ? "mb-6 mt-4" : "mb-8"}`}
          initial={{ opacity: 0, y: 30 }}
          animate={{
            opacity: 1,
            y: 0,
            scale:
              currentConversation || isListening || isVoiceInput
                ? 0.9
                : 1,
          }}
          transition={{
            duration: 0.8,
            delay: 0.8,
            type: "spring",
            stiffness: 80,
          }}
        >
          <AudioControls
            isListening={isListening}
            setIsListening={(listening) => {
              console.log(
                "Setting listening state:",
                listening,
              );
              dispatch({
                type: "SET_IS_LISTENING",
                payload: listening,
              });
              dispatch({
                type: "SET_SPEECH_ERROR",
                payload: null,
              });

              if (listening && !conversationMode) {
                conversationHandlers.handleClearConversation();
              }
            }}
          />
        </motion.div>
      </div>

      {/* Bottom Input */}
      <BottomInput
        placeholder={getInputPlaceholder()}
        disabled={
          isListening ||
          isProcessing ||
          extractingText ||
          isVoiceInput
        }
        isVoiceInput={isVoiceInput}
        isListening={isListening}
        isProcessing={isProcessing}
        extractingText={extractingText}
        onTextSubmit={(text) => {
          if (text.trim() && !isProcessing) {
            performTranslation(text.trim(), "text");
          }
        }}
        onVoiceInput={handleVoiceInput}
        onImageUpload={() =>
          dispatch({
            type: "SET_SHOW_IMAGE_UPLOAD",
            payload: true,
          })
        }
        onKeyboardFocus={handleKeyboardInput}
      />

      {/* Dialogs and Overlays */}
      <TipsPopup
        isOpen={showTips}
        onClose={() =>
          dispatch({ type: "SET_SHOW_TIPS", payload: false })
        }
      />

      <ImageUploadDialog
        open={showImageUpload}
        onOpenChange={(open) =>
          dispatch({
            type: "SET_SHOW_IMAGE_UPLOAD",
            payload: open,
          })
        }
        onImageUpload={handleImageUpload}
      />

      <LoadingOverlays extractingText={extractingText} />

      <ErrorDisplay
        speechError={speechError}
        onDismiss={() =>
          dispatch({ type: "SET_SPEECH_ERROR", payload: null })
        }
        onFixMicrophone={() =>
          dispatch({
            type: "SET_SHOW_MICROPHONE_GUIDE",
            payload: true,
          })
        }
      />

      {/* Speech Recognition Components */}
      <SpeechRecognition
        isListening={isListening}
        language={fromLanguage}
        onResult={speechHandlers.handleSpeechResult}
        onError={speechHandlers.handleSpeechError}
        onStart={speechHandlers.handleSpeechStart}
        onEnd={speechHandlers.handleSpeechEnd}
        continuous={true}
        interimResults={true}
        maxAlternatives={3}
      />

      <AudioRecorder
        isRecording={isRecordingAudio}
        onAudioData={speechHandlers.handleAudioData}
        onError={speechHandlers.handleAudioError}
        maxDuration={30000}
        sampleRate={48000}
        audioBitsPerSecond={128000}
      />

      <MicrophonePermissionGuide
        isOpen={showMicrophoneGuide}
        onClose={() =>
          dispatch({
            type: "SET_SHOW_MICROPHONE_GUIDE",
            payload: false,
          })
        }
        onPermissionGranted={handleMicrophonePermissionGranted}
      />
    </div>
  );
}