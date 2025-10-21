import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useConfig,
} from "wagmi";
import { formatUnits } from "viem";
import { readContract } from "viem/actions";
import { LockerContract, BLOCK_EXPLORER } from "../lib/config";
import { tokenAbi } from "../lib/tokenABI";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  Lock,
  Unlock,
  Clock,
  User,
  CheckCircle2,
  Info,
  Menu,
  X,
  ExternalLink,
  MessageCircle,
  Copy,
} from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo_falwsb.png";

interface LockData {
  id: bigint;
  token: string;
  owner: string;
  amount: bigint;
  lockDate: bigint;
  UnlockedDate: bigint;
  unlockedAmount: bigint;
  name: string;
  description: string;
}

function TokenAmount({ token, amount }: { token: string; amount: bigint }) {
  const { data: decimals } = useReadContract({
    address: token as `0x${string}`,
    abi: tokenAbi,
    functionName: "decimals",
    query: {
      enabled: token?.length === 42 && token.startsWith("0x"),
    },
  });

  const { data: symbol } = useReadContract({
    address: token as `0x${string}`,
    abi: tokenAbi,
    functionName: "symbol",
    query: {
      enabled: token?.length === 42 && token.startsWith("0x"),
    },
  });

  const dec = decimals !== undefined ? Number(decimals) : 18;
  const formatted = (() => {
    try {
      return formatUnits(amount, dec);
    } catch {
      return formatUnits(amount, 18);
    }
  })();

  return (
    <span>
      {formatted} {symbol ? String(symbol) : ""}
    </span>
  );
}

export default function UnlockPage() {
  const [error, setError] = useState<string | null>(null);
  const [showTxHash, setShowTxHash] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [userLocks, setUserLocks] = useState<LockData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { address } = useAccount();
  const config = useConfig();
  const {
    data: txHash,
    error: contractError,
    writeContract,
  } = useWriteContract();
  const { isSuccess: txSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Set error from contract error
  useEffect(() => {
    if (contractError) {
      setError(
        contractError.message || "Transaction failed. Please try again."
      );
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
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
      loadUserLocks();

      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [txSuccess]);

  // Read total lock count
  const { data: totalLocks } = useReadContract({
    address: LockerContract.address as `0x${string}`,
    abi: LockerContract.abi,
    functionName: "getTotalLockCount",
  });

  // Load user's locks
  const loadUserLocks = async () => {
    if (!address || !totalLocks || totalLocks === BigInt(0)) {
      setUserLocks([]);
      return;
    }

    setIsLoading(true);
    const locks: LockData[] = [];
    const count = Number(totalLocks);

    // Fetch all locks and filter by owner
    for (let i = 0; i < count; i++) {
      try {
        // Fetch actual lock data from contract
        const lockData = (await readContract(config.getClient(), {
          address: LockerContract.address as `0x${string}`,
          abi: LockerContract.abi,
          functionName: "getLockAt",
          args: [BigInt(i)],
        })) as LockData;

        // Only add if owner matches the connected address
        if (lockData.owner.toLowerCase() === address.toLowerCase()) {
          locks.push(lockData);
        }
      } catch (error) {
        console.error(`Error fetching lock ${i}:`, error);
      }
    }

    setUserLocks(locks);
    setIsLoading(false);
  };

  useEffect(() => {
    loadUserLocks();
  }, [address, totalLocks, config]);

  const handleUnlock = async (lockId: bigint) => {
    if (!address) {
      setError("Please connect your wallet");
      return;
    }

    try {
      writeContract({
        address: LockerContract.address as `0x${string}`,
        abi: LockerContract.abi,
        functionName: "unlock",
        args: [lockId],
      });
    } catch (err: any) {
      setError(err.message || "Unlock failed");
    }
  };

  const handleCopyId = (lockId: bigint) => {
    try {
      navigator.clipboard.writeText(lockId.toString());
      setCopiedId(lockId.toString());
      setTimeout(() => setCopiedId(null), 1500);
    } catch {}
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getTimeRemaining = (unlockDate: bigint) => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (now >= unlockDate) return "Ready to unlock";

    const diff = Number(unlockDate - now);
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const isLockReady = (lock: LockData) => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    return lock.unlockedAmount === BigInt(0) && now >= lock.UnlockedDate;
  };

  const isLockActive = (lock: LockData) => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    return lock.unlockedAmount === BigInt(0) && now < lock.UnlockedDate;
  };

  const isLockClaimed = (lock: LockData) => {
    return lock.unlockedAmount > BigInt(0);
  };

  const activeLocks = userLocks.filter(isLockActive);
  const readyLocks = userLocks.filter(isLockReady);
  const claimedLocks = userLocks.filter(isLockClaimed);

  return (
    <div className="min-h-screen bg-light-blue font-baloo">
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
                className="hidden sm:block text-muted-blue hover:text-white transition-colors text-sm font-medium"
              >
                Create Lock
              </Link>
              <Link
                to="/unlock"
                className="hidden sm:block text-white transition-colors text-sm font-medium border-b-2 border-bright-blue pb-1"
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
                <div className="flex justify-center">
                  <ConnectButton />
                </div>
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
              className="block text-muted-blue hover:text-white font-medium py-2 px-3 rounded-lg hover:bg-muted-blue/10 transition-colors"
            >
              Create Lock
            </Link>
            <Link
              to="/unlock"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-white font-medium py-2 px-3 rounded-lg bg-bright-blue"
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
        {error && (
          <Alert className="mb-4 border-red-500 bg-red-50 shadow-lg">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {showTxHash && !error && (
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
        )}

        {showSuccess && (
          <Alert className="mb-4 border-green-500 bg-green-50 shadow-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-green-800 font-medium">
              Success! Tokens unlocked and returned to your wallet.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="mb-12 max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-dark-blue-green mb-4 font-fredoka">
            My <span className="text-[#19A24C]">Locks</span>
          </h1>
          <p className="text-lg text-dark-blue-green">
            Manage and unlock your token locks
          </p>
        </div>

        {!address ? (
          <div className="max-w-2xl mx-auto">
            <Card className="bg-dark-blue border-muted-blue">
              <CardContent className="pt-12 pb-12 text-center">
                <User className="w-16 h-16 text-muted-blue mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">
                  Connect Your Wallet
                </h3>
                <p className="text-muted-blue mb-6">
                  Please connect your wallet to view and manage your locks
                </p>
                <div className="flex justify-center">
                  <ConnectButton />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="bg-dark-blue border-muted-blue">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <Lock className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {activeLocks.length}
                      </p>
                      <p className="text-sm text-muted-blue">Active Locks</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-dark-blue border-muted-blue">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-yellow-500/10 rounded-lg">
                      <Clock className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {readyLocks.length}
                      </p>
                      <p className="text-sm text-muted-blue">Ready to Unlock</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-dark-blue border-muted-blue">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gray-500/10 rounded-lg">
                      <CheckCircle2 className="w-6 h-6 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {claimedLocks.length}
                      </p>
                      <p className="text-sm text-muted-blue">Claimed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Ready to Unlock */}
            {readyLocks.length > 0 && (
              <Card className="bg-dark-blue border-yellow-500">
                <CardHeader>
                  <CardTitle className="text-xl text-white flex items-center gap-2">
                    <Unlock className="w-5 h-5 text-yellow-500" />
                    Ready to Unlock ({readyLocks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {readyLocks.map((lock) => (
                    <Card
                      key={lock.id.toString()}
                      className="bg-light-gray border-yellow-500"
                    >
                      <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-lg font-bold text-dark-blue-green">
                                  {lock.name || `Lock #${lock.id.toString()}`}
                                </h3>
                                <p className="font-mono text-xs text-dark-blue-green/70 inline-flex items-center gap-2">
                                  <span>ID: {lock.id.toString()}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyId(lock.id)}
                                    className="p-1 hover:text-bright-blue transition-colors"
                                    aria-label="Copy Lock ID"
                                    title="Copy Lock ID"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  {copiedId === lock.id.toString() && (
                                    <span className="text-green-500">
                                      Copied!
                                    </span>
                                  )}
                                </p>
                                {lock.description && (
                                  <p className="text-sm text-dark-blue-green/70">
                                    {lock.description}
                                  </p>
                                )}
                              </div>
                              <Badge className="bg-yellow-500 ">
                                Ready to claim
                              </Badge>
                            </div>

                            <div className="grid sm:grid-cols-3 gap-2 text-sm">
                              <div>
                                <span className="text-dark-blue-green/70">
                                  Amount:
                                </span>
                                <p className="font-semibold text-dark-blue-green">
                                  <TokenAmount
                                    token={lock.token}
                                    amount={lock.amount}
                                  />
                                </p>
                              </div>
                              <div>
                                <span className="text-dark-blue-green/70">
                                  Token:
                                </span>
                                <a
                                  href={`${BLOCK_EXPLORER}/address/${lock.token}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-dark-blue-green text-xs hover:text-bright-blue inline-flex items-center gap-1"
                                >
                                  {formatAddress(lock.token)}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                              <div>
                                <span className="text-dark-blue-green/70">
                                  Unlocked:
                                </span>
                                <p className="font-semibold text-dark-blue-green">
                                  {formatDate(lock.UnlockedDate)}
                                </p>
                              </div>
                            </div>
                          </div>

                          <Button
                            onClick={() => handleUnlock(lock.id)}
                            className="bg-green-600 text-white md:w-auto w-full"
                          >
                            <Unlock className="w-4 h-4 mr-2" />
                            Unlock Now
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Active Locks */}
            <Card className="bg-dark-blue border-muted-blue">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-bright-blue" />
                  Active Locks ({activeLocks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-bright-blue border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-blue">Loading your locks...</p>
                  </div>
                ) : activeLocks.length === 0 ? (
                  <div className="text-center py-12">
                    <Info className="w-16 h-16 text-muted-blue mx-auto mb-4" />
                    <p className="text-muted-blue text-lg">No active locks</p>
                    <p className="text-sm text-muted-blue mt-2">
                      <Link to="/" className="text-bright-blue hover:underline">
                        Create a new lock
                      </Link>{" "}
                      to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeLocks.map((lock) => (
                      <Card
                        key={lock.id.toString()}
                        className="bg-light-gray border-muted-blue"
                      >
                        <CardContent className="pt-6">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="text-lg font-bold text-dark-blue-green">
                                    {lock.name || `Lock #${lock.id.toString()}`}
                                  </h3>
                                  <p className="font-mono text-xs text-dark-blue-green/70 inline-flex items-center gap-2">
                                    <span>ID: {lock.id.toString()}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyId(lock.id)}
                                      className="p-1 hover:text-bright-blue transition-colors"
                                      aria-label="Copy Lock ID"
                                      title="Copy Lock ID"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    {copiedId === lock.id.toString() && (
                                      <span className="text-green-500">
                                        Copied!
                                      </span>
                                    )}
                                  </p>
                                  {lock.description && (
                                    <p className="text-sm text-dark-blue-green/70">
                                      {lock.description}
                                    </p>
                                  )}
                                </div>
                                <Badge className="bg-green-500">Active</Badge>
                              </div>

                              <div className="grid sm:grid-cols-3 gap-2 text-sm">
                                <div>
                                  <span className="text-dark-blue-green/70">
                                    Amount:
                                  </span>
                                  <p className="font-semibold text-dark-blue-green">
                                    <TokenAmount
                                      token={lock.token}
                                      amount={lock.amount}
                                    />
                                  </p>
                                </div>
                                <div>
                                  <span className="text-dark-blue-green/70">
                                    Token:
                                  </span>
                                  <p className="font-mono text-dark-blue-green text-xs">
                                    {formatAddress(lock.token)}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-dark-blue-green/70">
                                    Unlocks:
                                  </span>
                                  <p className="font-semibold text-dark-blue-green">
                                    {formatDate(lock.UnlockedDate)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 mt-2">
                                <Clock className="w-4 h-4 text-bright-blue" />
                                <span className="text-sm font-semibold text-bright-blue">
                                  {getTimeRemaining(lock.UnlockedDate)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-green-600 text-sm">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Locked</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Claimed Locks */}
            {claimedLocks.length > 0 && (
              <Card className="bg-dark-blue border-muted-blue">
                <CardHeader>
                  <CardTitle className="text-xl text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-gray-500" />
                    Claimed Locks ({claimedLocks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {claimedLocks.map((lock) => (
                    <Card
                      key={lock.id.toString()}
                      className="bg-light-gray border-gray-300"
                    >
                      <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-lg font-bold text-dark-blue-green">
                                  {lock.name || `Lock #${lock.id.toString()}`}
                                </h3>
                                <p className="font-mono text-xs text-dark-blue-green/70 inline-flex items-center gap-2">
                                  <span>ID: {lock.id.toString()}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyId(lock.id)}
                                    className="p-1 hover:text-bright-blue transition-colors"
                                    aria-label="Copy Lock ID"
                                    title="Copy Lock ID"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  {copiedId === lock.id.toString() && (
                                    <span className="text-green-500">
                                      Copied!
                                    </span>
                                  )}
                                </p>
                                {lock.description && (
                                  <p className="text-sm text-dark-blue-green/70">
                                    {lock.description}
                                  </p>
                                )}
                              </div>
                              <Badge className="bg-gray-500">Claimed</Badge>
                            </div>

                            <div className="grid sm:grid-cols-3 gap-2 text-sm">
                              <div>
                                <span className="text-dark-blue-green/70">
                                  Amount:
                                </span>
                                <p className="font-semibold text-dark-blue-green">
                                  <TokenAmount
                                    token={lock.token}
                                    amount={lock.amount}
                                  />
                                </p>
                              </div>
                              <div>
                                <span className="text-dark-blue-green/70">
                                  Token:
                                </span>
                                <a
                                  href={`${BLOCK_EXPLORER}/address/${lock.token}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-dark-blue-green text-xs hover:text-bright-blue inline-flex items-center gap-1"
                                >
                                  {formatAddress(lock.token)}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                              <div>
                                <span className="text-dark-blue-green/70">
                                  Claimed Amount:
                                </span>
                                <p className="font-semibold text-dark-blue-green">
                                  <TokenAmount
                                    token={lock.token}
                                    amount={lock.unlockedAmount}
                                  />
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
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
