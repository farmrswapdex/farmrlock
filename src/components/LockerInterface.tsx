import { useState, useEffect, useMemo } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { LockerContract, BLOCK_EXPLORER } from "../lib/config";
import { formatUtcDate } from "@/lib/utils";
import { tokenAbi } from "../lib/tokenABI";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Lock,
  Clock,
  ExternalLink,
  MessageCircle,
  Menu,
  X,
  CheckCircle2,
  ArrowRight,
  Info,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo_falwsb.png";
import bigjuicy from "@/assets/bigjuicy.png";

export default function LockerInterface() {
  const [error, setError] = useState<string | null>(null);
  const [showTxHash, setShowTxHash] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const { address } = useAccount();
  const {
    data: txHash,
    error: contractError,
    writeContract,
  } = useWriteContract();
  const { isSuccess: txSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Lock form state
  const [tokenAddress, setTokenAddress] = useState("");
  const [lockAmount, setLockAmount] = useState("");
  const [lockDuration, setLockDuration] = useState("");
  const [durationUnit, setDurationUnit] = useState("days");
  const [lockName, setLockName] = useState("");
  const [lockDescription, setLockDescription] = useState("");
  const [selectedTokenDecimals, setSelectedTokenDecimals] =
    useState<number>(18);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [lastAction, setLastAction] = useState<"approve" | "lock" | null>(null);
  const navigate = useNavigate();

  // Set error from contract error
  useEffect(() => {
    if (contractError) {
      // Handle user rejection gracefully
      if (
        contractError.message?.includes("User rejected") ||
        contractError.message?.includes("User denied") ||
        contractError.message?.includes("user rejected")
      ) {
        setError("Transaction cancelled");
      } else {
        setError("Transaction failed. Please try again.");
      }
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      setIsApproving(false);
      setIsLocking(false);
      return () => clearTimeout(timer);
    }
  }, [contractError]);

  // Auto-dismiss error messages
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Show transaction hash
  useEffect(() => {
    if (txHash) {
      setShowTxHash(txHash as string);
      const timer = setTimeout(() => {
        setShowTxHash(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [txHash]);

  // Handle success
  useEffect(() => {
    if (txSuccess) {
      setError(null);
      setShowTxHash(null);
      setShowSuccess(true);
      refetchTotalLocks();
      refetchTokenBalance();
      refetchAllowance();

      const timer = setTimeout(() => {
        setShowSuccess(false);
        setSuccessMessage("");
      }, 5000);
      setIsApproving(false);
      setIsLocking(false);
      // Navigate after a short delay if we just locked tokens
      if (lastAction === "lock") {
        setTimeout(() => {
          navigate("/unlock");
          setLastAction(null);
        }, 1400);
      } else {
        setLastAction(null);
      }
      return () => clearTimeout(timer);
    }
  }, [txSuccess]);

  // Read token decimals for selected token
  const { data: tokenDecimals } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenAbi,
    functionName: "decimals",
    query: {
      enabled: tokenAddress?.length === 42 && tokenAddress.startsWith("0x"),
    },
  });

  // Read token symbol for display
  const { data: tokenSymbol } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenAbi,
    functionName: "symbol",
    query: {
      enabled: tokenAddress?.length === 42 && tokenAddress.startsWith("0x"),
    },
  });

  useEffect(() => {
    if (tokenDecimals !== undefined) {
      setSelectedTokenDecimals(Number(tokenDecimals));
    }
  }, [tokenDecimals]);

  // Read user's token balance
  const { data: rawTokenBalance, refetch: refetchTokenBalance } =
    useReadContract({
      address: tokenAddress as `0x${string}`,
      abi: tokenAbi,
      functionName: "balanceOf",
      args: address && tokenAddress ? [address] : undefined,
      query: {
        enabled:
          !!address &&
          tokenAddress?.length === 42 &&
          tokenAddress.startsWith("0x"),
      },
    });

  // Read total lock count
  const { data: totalLocks, refetch: refetchTotalLocks } = useReadContract({
    address: LockerContract.address as `0x${string}`,
    abi: LockerContract.abi,
    functionName: "getTotalLockCount",
  });

  // Read allowance for token
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenAbi,
    functionName: "allowance",
    args:
      address && tokenAddress ? [address, LockerContract.address] : undefined,
    query: {
      enabled:
        !!address &&
        tokenAddress?.length === 42 &&
        tokenAddress.startsWith("0x"),
    },
  });

  // Helper: convert durations to seconds
  const convertToSeconds = (value: string, unit: string): bigint => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return BigInt(0);

    switch (unit) {
      case "seconds":
        return BigInt(Math.floor(numValue));
      case "minutes":
        return BigInt(Math.floor(numValue * 60));
      case "hours":
        return BigInt(Math.floor(numValue * 60 * 60));
      case "days":
        return BigInt(Math.floor(numValue * 24 * 60 * 60));
      case "weeks":
        return BigInt(Math.floor(numValue * 7 * 24 * 60 * 60));
      case "months":
        return BigInt(Math.floor(numValue * 30 * 24 * 60 * 60));
      default:
        return BigInt(Math.floor(numValue * 24 * 60 * 60));
    }
  };

  const formattedTokenBalance = useMemo(() => {
    if (rawTokenBalance == null || !tokenDecimals) return "0";
    try {
      return parseFloat(
        formatUnits(rawTokenBalance as bigint, Number(tokenDecimals))
      ).toLocaleString();
    } catch {
      return "0";
    }
  }, [rawTokenBalance, tokenDecimals]);

  const isValidAddress = useMemo(() => {
    return tokenAddress?.length === 42 && tokenAddress.startsWith("0x");
  }, [tokenAddress]);

  const amountValid = useMemo(() => parseFloat(lockAmount) > 0, [lockAmount]);
  const durationValid = useMemo(() => parseFloat(lockDuration) > 0, [lockDuration]);
  const nameValid = useMemo(() => lockName.trim().length > 0, [lockName]);

  const durationSeconds = useMemo(
    () => Number(convertToSeconds(lockDuration, durationUnit)),
    [lockDuration, durationUnit]
  );

  const estimatedUnlock = useMemo(() => {
    if (!durationValid) return null;
    try {
      const ms = Date.now() + durationSeconds * 1000;
      const seconds = Math.floor(ms / 1000);
      return formatUtcDate(seconds);
    } catch {
      return null;
    }
  }, [durationValid, durationSeconds]);

  const humanizeSeconds = (sec: number) => {
    if (!isFinite(sec) || sec <= 0) return "—";
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const stepIndex = useMemo(() => {
    // 1: Token, 2: Amount, 3: Details, 4: Approve/Lock
    let s = 1;
    if (isValidAddress) s = 2;
    if (isValidAddress && amountValid) s = 3;
    if (isValidAddress && amountValid && durationValid && nameValid) s = 4;
    return s;
  }, [isValidAddress, amountValid, durationValid, nameValid]);

  

  const handleApprove = async () => {
    if (!tokenAddress || !lockAmount) {
      setError("Please enter token address and amount");
      return;
    }

    try {
      setIsApproving(true);
      const amountToApprove = parseUnits(lockAmount, selectedTokenDecimals);
      writeContract({
        address: tokenAddress as `0x${string}`,
        abi: tokenAbi,
        functionName: "approve",
        args: [LockerContract.address, amountToApprove],
      });
      setLastAction("approve");
      setSuccessMessage(
        "Token approval successful! You can now lock your tokens."
      );
    } catch (err: any) {
      // Error handling is done in the useEffect for contractError
      setIsApproving(false);
    }
  };

  const handleSetMaxAmount = () => {
    try {
      if (rawTokenBalance == null || tokenDecimals == null) return;
      const max = formatUnits(rawTokenBalance as bigint, Number(tokenDecimals));
      setLockAmount(max);
    } catch {}
  };

  const handleLock = async () => {
    if (!address) {
      setError("Please connect your wallet");
      return;
    }

    if (!tokenAddress || !lockAmount || !lockDuration || !lockName) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setIsLocking(true);
      const amountToLock = parseUnits(lockAmount, selectedTokenDecimals);
      const durationInSeconds = convertToSeconds(lockDuration, durationUnit);

      writeContract({
        address: LockerContract.address as `0x${string}`,
        abi: LockerContract.abi,
        functionName: "lock",
        args: [
          address,
          tokenAddress as `0x${string}`,
          amountToLock,
          durationInSeconds,
          lockName,
          lockDescription || "",
        ],
      });
      setLastAction("lock");
      setSuccessMessage(
        `Lock created successfully! Your tokens are now secured.`
      );

      // Clear form
      setLockAmount("");
      setLockDuration("");
      setLockName("");
      setLockDescription("");
    } catch (err: any) {
      // Error handling is done in the useEffect for contractError
      setIsLocking(false);
    }
  };

  const isApprovalNeeded = useMemo(() => {
    if (!allowance || !lockAmount) return true;
    try {
      const amountToLock = parseUnits(lockAmount, selectedTokenDecimals);
      return (allowance as bigint) < amountToLock;
    } catch {
      return true;
    }
  }, [allowance, lockAmount, selectedTokenDecimals]);

  return (
    <div className="min-h-screen bg-light-blue font-baloo relative">
      {/* Soft decorative gradient background */}
      <div className="pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(70%_60%_at_50%_0%,#000_40%,transparent_80%)]">
        <div className="absolute inset-x-0 -top-24 h-80 bg-gradient-to-b from-light-blue to-light-blue-alt/40 blur-2xl" />
      </div>
      {/* Header */}
      <header className="border-b bg-dark-blue backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between min-h-[48px]">
            <Link
              to="/"
              className="flex items-center gap-2 sm:gap-3 flex-shrink-0"
            >
              <img
                src={logo}
                alt="FarmrSwap"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg shadow-md"
              />
              <h1 className="text-lg sm:text-xl font-bold text-muted-blue font-fredoka">
                FarmrLock
              </h1>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                to="/"
                className="hidden sm:block text-white transition-colors text-sm font-medium border-b-2 border-bright-blue pb-1"
              >
                Create Lock
              </Link>
              <Link
                to="/unlock"
                className="hidden sm:block text-muted-blue hover:text-white transition-colors text-sm font-medium"
              >
                My Locks
              </Link>
              <Link
                to="/query"
                className="hidden sm:block text-muted-blue hover:text-white transition-colors text-sm font-medium"
              >
                Browse Locks
              </Link>
              <div className="scale-90 sm:scale-100">
                <ConnectButton />
              </div>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden text-white p-2"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-dark-blue border-b border-muted-blue">
          <div className="container mx-auto px-4 py-4 space-y-3">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-white font-medium py-2 px-3 rounded-lg bg-bright-blue"
            >
              Create Lock
            </Link>
            <Link
              to="/unlock"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-muted-blue hover:text-white font-medium py-2 px-3 rounded-lg hover:bg-muted-blue/10 transition-colors"
            >
              My Locks
            </Link>
            <Link
              to="/query"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-muted-blue hover:text-white font-medium py-2 px-3 rounded-lg hover:bg-muted-blue/10 transition-colors"
            >
              Browse Locks
            </Link>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Alert className="mb-4 border-red-500 bg-red-50 shadow-lg">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {showTxHash && !error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Alert className="mb-4 shadow-lg border-blue-500 bg-blue-50">
                <Clock className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <div className="flex items-center gap-2">
                    <span>Transaction pending...</span>
                    <a
                      href={`${BLOCK_EXPLORER}/tx/${showTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline font-medium"
                    >
                      View
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {showSuccess && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Alert className="mb-4 border-green-500 bg-green-50 shadow-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <AlertDescription className="text-green-800 font-medium">
                  {successMessage || "Success!"}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="mb-12 max-w-5xl mx-auto relative">
          <div className="absolute -inset-x-6 -top-6 bottom-0 rounded-3xl bg-white/10 blur-3xl opacity-20" />
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-center lg:text-left flex-1">
              <h1 className="text-4xl md:text-6xl font-bold text-dark-blue-green mb-4 font-fredoka">
                Farmr<span className="text-[#19A24C]">Lock</span>
                <br />
                <span className="text-dark-blue-green bg-clip-text">
                  Token Locker
                </span>
              </h1>
              <p className="text-lg text-dark-blue-green">
                Securely lock your tokens for a specified period. Build trust
                with time-locked liquidity.
              </p>
            </div>
            <img
              src={bigjuicy}
              alt="FarmrLock"
              className="hidden lg:block w-64 h-64 object-contain flex-shrink-0"
            />
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-12 gap-8 max-w-5xl mx-auto">
          {/* Lock Creation Form - Narrower */}
          <div className="lg:col-span-8">
            <Card className="bg-dark-blue border-muted-blue">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-bright-blue" />
                  Create New Lock
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Stepper */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "Token" },
                    { label: "Amount" },
                    { label: "Details" },
                    { label: "Approve & Lock" },
                  ].map((st, idx) => {
                    const pos = idx + 1;
                    const active = stepIndex === pos;
                    const complete = stepIndex > pos;
                    return (
                      <motion.div
                        key={st.label}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.05 }}
                        className={`rounded-lg border px-3 py-2 text-center text-xs font-semibold transition ${
                          complete
                            ? "bg-bright-blue/20 border-bright-blue text-white"
                            : active
                            ? "bg-[#0f1526] border-bright-blue text-white"
                            : "bg-[#0f1526] border-muted-blue/50 text-muted-blue"
                        }`}
                      >
                        {st.label}
                      </motion.div>
                    );
                  })}
                </div>
                <div>
                  <Label htmlFor="tokenAddress" className="text-muted-blue">
                    Token Address *
                  </Label>
                  <Input
                    id="tokenAddress"
                    placeholder="0x..."
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    className="mt-1 bg-light-gray text-dark-blue-green border-muted-blue"
                  />
                  <div className="flex items-center justify-between mt-1">
                    {rawTokenBalance !== undefined && (
                      <p className="text-xs text-muted-blue">
                        Balance: {formattedTokenBalance} {tokenSymbol ? String(tokenSymbol) : ""}
                      </p>
                    )}
                    {isValidAddress && (
                      <a
                        href={`${BLOCK_EXPLORER}/address/${tokenAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-bright-blue hover:text-[#19A24C] inline-flex items-center gap-1"
                      >
                        View Token
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="amount" className="text-muted-blue">
                    Amount to Lock *
                  </Label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.0"
                      value={lockAmount}
                      onChange={(e) => setLockAmount(e.target.value)}
                      className="flex-1 bg-light-gray text-dark-blue-green border-muted-blue"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSetMaxAmount}
                      disabled={rawTokenBalance == null}
                      className="h-9 px-3 text-sm bg-light-gray text-dark-blue-green border-muted-blue hover:bg-light-gray"
                    >
                      Max
                    </Button>
                  </div>
                  <p className="text-xs text-muted-blue mt-1">
                    {tokenSymbol ? `Token: ${String(tokenSymbol)}` : isValidAddress ? "Fetching token symbol..." : ""}
                  </p>
                </div>

                <div>
                  <Label htmlFor="duration" className="text-muted-blue">
                    Lock Duration *
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="duration"
                      type="number"
                      placeholder="Enter duration"
                      value={lockDuration}
                      onChange={(e) => setLockDuration(e.target.value)}
                      className="flex-1 bg-light-gray text-dark-blue-green border-muted-blue"
                    />
                    <Select
                      value={durationUnit}
                      onValueChange={setDurationUnit}
                    >
                      <SelectTrigger className="w-[120px] bg-light-gray text-dark-blue-green border-muted-blue">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-dark-blue border-muted-blue">
                        <SelectItem
                          value="seconds"
                          className="text-white hover:bg-muted-blue/20 cursor-pointer"
                        >
                          Seconds
                        </SelectItem>
                        <SelectItem
                          value="minutes"
                          className="text-white hover:bg-muted-blue/20 cursor-pointer"
                        >
                          Minutes
                        </SelectItem>
                        <SelectItem
                          value="hours"
                          className="text-white hover:bg-muted-blue/20 cursor-pointer"
                        >
                          Hours
                        </SelectItem>
                        <SelectItem
                          value="days"
                          className="text-white hover:bg-muted-blue/20 cursor-pointer"
                        >
                          Days
                        </SelectItem>
                        <SelectItem
                          value="weeks"
                          className="text-white hover:bg-muted-blue/20 cursor-pointer"
                        >
                          Weeks
                        </SelectItem>
                        <SelectItem
                          value="months"
                          className="text-white hover:bg-muted-blue/20 cursor-pointer"
                        >
                          Months
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {lockDuration && (
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="text-muted-blue">
                        = {convertToSeconds(lockDuration, durationUnit).toString()} seconds ({humanizeSeconds(durationSeconds)})
                      </div>
                      {estimatedUnlock && (
                        <div className="text-muted-blue inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Estimated unlock: <span className="font-semibold text-white/90">{estimatedUnlock}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="lockName" className="text-muted-blue">
                    Lock Name *
                  </Label>
                  <Input
                    id="lockName"
                    placeholder="e.g., Team Tokens - Q1 2025"
                    value={lockName}
                    onChange={(e) => setLockName(e.target.value)}
                    className="mt-1 bg-light-gray text-dark-blue-green border-muted-blue"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-muted-blue">
                    Description (Optional)
                  </Label>
                  <Input
                    id="description"
                    placeholder="Add details about this lock..."
                    value={lockDescription}
                    onChange={(e) => setLockDescription(e.target.value)}
                    className="mt-1 bg-light-gray text-dark-blue-green border-muted-blue"
                  />
                </div>

                <Separator className="bg-muted-blue" />

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {isApprovalNeeded && (
                    <motion.button
                      onClick={handleApprove}
                      disabled={!address || !tokenAddress || !lockAmount || isApproving || isLocking}
                      className="w-full sm:flex-1 h-9 rounded-md px-4 font-medium bg-[#19A24C] hover:bg-bright-blue text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      whileTap={{ scale: 0.98 }}
                    >
                      {isApproving ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                          Approving...
                        </span>
                      ) : (
                        "1. Approve Token"
                      )}
                    </motion.button>
                  )}
                  <motion.button
                    onClick={handleLock}
                    disabled={!address || isApprovalNeeded || !lockName || isApproving || isLocking}
                    className="w-full sm:flex-1 h-9 rounded-md px-4 font-medium bg-bright-blue hover:bg-[#19A24C] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    whileTap={{ scale: 0.98 }}
                  >
                    {isLocking ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Locking...
                      </span>
                    ) : isApprovalNeeded ? (
                      "2. Lock Tokens"
                    ) : (
                      "Lock Tokens"
                    )}
                  </motion.button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Info */}
          <div className="lg:col-span-4 space-y-6">
            {/* Summary Card */}
            <Card className="bg-dark-blue border-bright-blue/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Info className="w-5 h-5 text-bright-blue" /> Lock Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isValidAddress && !amountValid && !durationValid && !nameValid ? (
                  <div className="text-center py-6 text-muted-blue text-sm">
                    Fill the form to preview your lock details
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-blue">Token</span>
                      <span className="font-mono text-white truncate max-w-[60%] text-right">
                        {isValidAddress ? `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}` : "—"}
                        {tokenSymbol ? ` (${String(tokenSymbol)})` : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-blue">Amount</span>
                      <span className="text-white font-semibold">
                        {lockAmount || "—"} {tokenSymbol ? String(tokenSymbol) : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-blue">Duration</span>
                      <span className="text-white">{lockDuration ? `${lockDuration} ${durationUnit}` : "—"} {lockDuration && `(${humanizeSeconds(durationSeconds)})`}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-blue">Est. Unlock</span>
                      <span className="text-white">{estimatedUnlock || "—"}</span>
                    </div>
                    <Separator className="bg-muted-blue/30" />
                    <div className="flex items-center justify-between">
                      <span className="text-muted-blue">Name</span>
                      <span className="text-white truncate max-w-[60%] text-right">{lockName || "—"}</span>
                    </div>
                    {lockDescription && (
                      <div className="flex items-start justify-between">
                        <span className="text-muted-blue">Description</span>
                        <span className="text-white text-right max-w-[60%]">{lockDescription}</span>
                      </div>
                    )}
                    <div className="pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-blue">Approval</span>
                        <div className="inline-flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${isApprovalNeeded ? "bg-yellow-400" : "bg-green-500"}`} />
                          <span className="text-white text-xs">
                            {isApprovalNeeded ? "Needed" : "Approved"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Progress value={isApprovalNeeded ? 50 : 100} />
                      </div>
                    </div>
                  </div>
                )}
                <div className="text-[11px] text-muted-blue/80 leading-relaxed">
                  By locking, you agree funds remain unspendable until the unlock time. Always verify the token address and amount before confirming.
                </div>
              </CardContent>
            </Card>
            {/* Stats Card */}
            <Card className="bg-dark-blue border-muted-blue">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-white">
                  Platform Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-3xl font-bold text-bright-blue">
                    {totalLocks?.toString() || "0"}
                  </p>
                  <p className="text-sm text-muted-blue">Total Locks Created</p>
                </div>
                <Separator className="bg-muted-blue/30" />
                <Link
                  to="/query"
                  className="flex items-center justify-between px-3 py-2 bg-light-gray/10 hover:bg-bright-blue/20 text-muted-blue hover:text-white rounded-lg transition-colors text-sm group"
                >
                  <span>Browse All Locks</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/unlock"
                  className="flex items-center justify-between px-3 py-2 bg-light-gray/10 hover:bg-bright-blue/20 text-muted-blue hover:text-white rounded-lg transition-colors text-sm group"
                >
                  <span>View My Locks</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </CardContent>
            </Card>

            {/* How It Works */}
            <Card className="bg-dark-blue border-muted-blue">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-white">
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-bright-blue flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs">1</span>
                  </div>
                  <p className="text-sm text-muted-blue">
                    Enter token details and lock duration
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-bright-blue flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs">2</span>
                  </div>
                  <p className="text-sm text-muted-blue">
                    Approve the token contract
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-bright-blue flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs">3</span>
                  </div>
                  <p className="text-sm text-muted-blue">
                    Lock your tokens securely
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-bright-blue flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs">4</span>
                  </div>
                  <p className="text-sm text-muted-blue">
                    Unlock when the time period expires
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Community Links moved to footer */}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-dark-blue border-t border-muted-blue mt-16 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="FarmrLock" className="w-8 h-8 rounded-lg" />
              <p className="text-muted-blue text-sm">© 2025 FarmrSwap. All rights reserved.</p>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/" className="text-muted-blue hover:text-white text-sm transition-colors">Create Lock</Link>
              <Link to="/unlock" className="text-muted-blue hover:text-white text-sm transition-colors">My Locks</Link>
              <Link to="/query" className="text-muted-blue hover:text-white text-sm transition-colors">Browse Locks</Link>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-center">
            <span className="text-muted-blue text-sm">Join Our Community</span>
            <a
              href="https://farmrswap.gitbook.io/docs/roadmap"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-blue hover:text-white text-sm inline-flex items-center gap-1"
            >
              <span>Roadmap</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://t.me/farmrswap"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-blue hover:text-white text-sm inline-flex items-center gap-2"
            >
              <MessageCircle className="w-3 h-3" />
              <span>Telegram</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://x.com/farmrswap"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-blue hover:text-white text-sm inline-flex items-center gap-1"
            >
              <span>Twitter/X</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
