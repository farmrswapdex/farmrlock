import { useState, useEffect } from "react";
import { useReadContract, useConfig } from "wagmi";
import { formatUnits } from "viem";
import { tokenAbi } from "../lib/tokenABI";
import { readContract } from "viem/actions";
import { LockerContract, BLOCK_EXPLORER } from "../lib/config";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Lock,
  Clock,
  User,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Menu,
  X,
  ExternalLink,
  MessageCircle,
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
    query: { enabled: token?.length === 42 && token.startsWith("0x") },
  });

  const { data: symbol } = useReadContract({
    address: token as `0x${string}`,
    abi: tokenAbi,
    functionName: "symbol",
    query: { enabled: token?.length === 42 && token.startsWith("0x") },
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

export default function LocksQuery() {
  const [searchLockId, setSearchLockId] = useState("");
  const [searchTokenAddress, setSearchTokenAddress] = useState("");
  const [displayedLocks, setDisplayedLocks] = useState<LockData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const config = useConfig();

  // Read total lock count
  const { data: totalLocks } = useReadContract({
    address: LockerContract.address as `0x${string}`,
    abi: LockerContract.abi,
    functionName: "getTotalLockCount",
  });

  // Fetch lock by ID
  const { refetch: refetchLockById } = useReadContract({
    address: LockerContract.address as `0x${string}`,
    abi: LockerContract.abi,
    functionName: "getLockById",
    args: searchLockId ? [BigInt(searchLockId)] : undefined,
    query: {
      enabled: false,
    },
  });

  // Load recent locks on mount
  useEffect(() => {
    const loadRecentLocks = async () => {
      if (!totalLocks || totalLocks === BigInt(0)) {
        setDisplayedLocks([]);
        return;
      }

      setIsLoading(true);
      const locks: LockData[] = [];
      const count = Number(totalLocks);
      const startIndex = Math.max(0, count - 10); // Show last 10 locks

      for (let i = count - 1; i >= startIndex; i--) {
        try {
          // Fetch actual lock data from contract using wagmi
          const lockData = (await readContract(config.getClient(), {
            address: LockerContract.address as `0x${string}`,
            abi: LockerContract.abi,
            functionName: "getLockAt",
            args: [BigInt(i)],
          })) as LockData;

          locks.push(lockData);
        } catch (error) {
          console.error(`Error fetching lock ${i}:`, error);
        }
      }

      setDisplayedLocks(locks);
      setIsLoading(false);
    };

    loadRecentLocks();
  }, [totalLocks, config]);

  const handleSearchById = async () => {
    if (!searchLockId) return;

    try {
      setIsLoading(true);
      const result = await refetchLockById();
      if (result.data) {
        const lock = result.data as LockData;
        setDisplayedLocks([lock]);
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Error searching lock:", error);
      setIsLoading(false);
    }
  };

  const handleShowAll = async () => {
    setSearchLockId("");
    setSearchTokenAddress("");
    // Reload recent locks
    window.location.reload();
  };

  const formatDate = (timestamp: bigint) => {
    if (timestamp === BigInt(0)) return "N/A";
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isLockActive = (lock: LockData) => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    return lock.unlockedAmount === BigInt(0) && now < lock.UnlockedDate;
  };

  const isLockExpired = (lock: LockData) => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    return lock.unlockedAmount === BigInt(0) && now >= lock.UnlockedDate;
  };

  const isLockClaimed = (lock: LockData) => {
    return lock.unlockedAmount > BigInt(0);
  };

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
                className="hidden sm:block text-muted-blue hover:text-white transition-colors text-sm font-medium"
              >
                My Locks
              </Link>
              <Link
                to="/query"
                className="hidden sm:block text-white transition-colors text-sm font-medium border-b-2 border-bright-blue pb-1"
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
              className="block text-muted-blue hover:text-white font-medium py-2 px-3 rounded-lg hover:bg-muted-blue/10 transition-colors"
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
              className="block text-white font-medium py-2 px-3 rounded-lg bg-bright-blue"
            >
              Browse Locks
            </Link>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="mb-12 max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-dark-blue-green mb-4 font-fredoka">
            Browse All <span className="text-[#19A24C]">Locks</span>
          </h1>
          <p className="text-lg text-dark-blue-green">
            Search and view details of any token lock
          </p>
        </div>

        <div className="max-w-6xl mx-auto space-y-8">
          {/* Search Section */}
          <Card className="bg-dark-blue border-muted-blue">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-bright-blue" />
                Search Locks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lockId" className="text-muted-blue">
                    Search by Lock ID
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="lockId"
                      type="number"
                      placeholder="Enter lock ID..."
                      value={searchLockId}
                      onChange={(e) => setSearchLockId(e.target.value)}
                      className="bg-light-gray text-dark-blue-green border-muted-blue"
                    />
                    <Button
                      onClick={handleSearchById}
                      disabled={!searchLockId}
                      className="bg-bright-blue hover:bg-[#19A24C] text-white"
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="tokenAddress" className="text-muted-blue">
                    Search by Token Address
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="tokenAddress"
                      placeholder="0x..."
                      value={searchTokenAddress}
                      onChange={(e) => setSearchTokenAddress(e.target.value)}
                      className="bg-light-gray text-dark-blue-green border-muted-blue"
                    />
                    <Button disabled className="bg-muted-blue text-white">
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-blue mt-1">Coming soon</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleShowAll}
                  variant="outline"
                  className="bg-light-gray text-dark-blue-green hover:bg-muted-blue"
                >
                  Show All Recent Locks
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-dark-blue border-muted-blue">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-bright-blue/10 rounded-lg">
                    <Lock className="w-6 h-6 text-bright-blue" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {totalLocks?.toString() || "0"}
                    </p>
                    <p className="text-sm text-muted-blue">Total Locks</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-dark-blue border-muted-blue">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-[#19A24C]/10 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-[#19A24C]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {displayedLocks.length}
                    </p>
                    <p className="text-sm text-muted-blue">Showing</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-dark-blue border-muted-blue">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-muted-blue/10 rounded-lg">
                    <Clock className="w-6 h-6 text-muted-blue" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">Live</p>
                    <p className="text-sm text-muted-blue">Real-time Data</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Locks List */}
          <Card className="bg-dark-blue border-muted-blue">
            <CardHeader>
              <CardTitle className="text-xl text-white">Lock Details</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-bright-blue border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-muted-blue">Loading locks...</p>
                </div>
              ) : displayedLocks.length === 0 ? (
                <div className="text-center py-12">
                  <Lock className="w-16 h-16 text-muted-blue mx-auto mb-4" />
                  <p className="text-muted-blue text-lg">No locks found</p>
                  <p className="text-sm text-muted-blue mt-2">
                    Try searching by lock ID or create a new lock
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedLocks.map((lock) => (
                    <Card
                      key={lock.id.toString()}
                      className="bg-light-gray border-muted-blue"
                    >
                      <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-lg font-bold text-dark-blue-green">
                                  {lock.name || `Lock #${lock.id.toString()}`}
                                </h3>
                                {lock.description && (
                                  <p className="text-sm text-dark-blue-green/70 mt-1">
                                    {lock.description}
                                  </p>
                                )}
                              </div>
                              <Badge
                                className={
                                  isLockClaimed(lock)
                                    ? "bg-gray-500"
                                    : isLockExpired(lock)
                                    ? "bg-orange-500"
                                    : "bg-green-500"
                                }
                              >
                                {isLockClaimed(lock)
                                  ? "Unlocked"
                                  : isLockExpired(lock)
                                  ? "Unlockable"
                                  : "Active"}
                              </Badge>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Lock className="w-4 h-4 text-bright-blue" />
                                <span className="text-dark-blue-green/70">
                                  Lock ID:
                                </span>
                                <span className="font-semibold text-dark-blue-green">
                                  #{lock.id.toString()}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-bright-blue" />
                                <span className="text-dark-blue-green/70">
                                  Owner:
                                </span>
                                <a
                                  href={`${BLOCK_EXPLORER}/address/${lock.owner}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-dark-blue-green hover:text-bright-blue inline-flex items-center gap-1"
                                >
                                  {formatAddress(lock.owner)}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>

                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-bright-blue" />
                                <span className="text-dark-blue-green/70">
                                  Amount:
                                </span>
                                <span className="font-semibold text-dark-blue-green">
                                  <TokenAmount
                                    token={lock.token}
                                    amount={lock.amount}
                                  />
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-bright-blue" />
                                <span className="text-dark-blue-green/70">
                                  Unlock Date:
                                </span>
                                <span className="font-semibold text-dark-blue-green">
                                  {formatDate(lock.UnlockedDate)}
                                </span>
                              </div>
                            </div>

                            <div className="text-xs text-dark-blue-green/60">
                              Token:
                              <a
                                href={`${BLOCK_EXPLORER}/address/${lock.token}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-1 hover:text-bright-blue inline-flex items-center gap-1"
                              >
                                {formatAddress(lock.token)}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>

                          <div className="flex md:flex-col gap-2">
                            {isLockActive(lock) && (
                              <div className="flex items-center gap-1 text-green-600 text-sm">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Locked</span>
                              </div>
                            )}
                            {isLockExpired(lock) && (
                              <div className="flex items-center gap-1 text-orange-600 text-sm">
                                <Clock className="w-4 h-4" />
                                <span>Unclaimed</span>
                              </div>
                            )}
                            {isLockClaimed(lock) && (
                              <div className="flex items-center gap-1 text-gray-600 text-sm">
                                <XCircle className="w-4 h-4" />
                                <span>Claimed</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
