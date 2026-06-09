'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  Loader2,
  Search,
  Sparkles,
  DoorClosed,
  Brush,
  CalendarClock,
  Wrench,
  Info,
  MoreVertical,
  Layers,
} from 'lucide-react';

import type { RoomType, Room } from '@/types';
import { RoomStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRoomTypes } from '@/hooks/use-room-types';
import { useRooms, useUpdateRoomStatus, useDeleteRoom } from '@/hooks/use-rooms';
import { RoomCreateDialog } from './room-create-dialog';

// Status config with aesthetics, colors, and matching icons
const STATUS_CONFIG = {
  [RoomStatus.AVAILABLE]: {
    label: 'Sẵn sàng',
    color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20',
    dot: 'bg-emerald-500',
    icon: Sparkles,
  },
  [RoomStatus.OCCUPIED]: {
    label: 'Đang có khách',
    color: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20',
    dot: 'bg-rose-500',
    icon: DoorClosed,
  },
  [RoomStatus.RESERVED]: {
    label: 'Đã đặt trước',
    color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20',
    dot: 'bg-amber-500',
    icon: CalendarClock,
  },
  [RoomStatus.CLEANING]: {
    label: 'Đang dọn dẹp',
    color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20',
    dot: 'bg-blue-500',
    icon: Brush,
  },
  [RoomStatus.MAINTENANCE]: {
    label: 'Bảo trì / Sửa chữa',
    color: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/20',
    dot: 'bg-zinc-500',
    icon: Wrench,
  },
};

export default function RoomsPage() {
  const params = useParams<{ id: string }>();
  const propertyId = params.id;

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedFloor, setSelectedFloor] = React.useState<string>('all');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all');
  const [expandedRoomTypes, setExpandedRoomTypes] = React.useState<Record<string, boolean>>({});

  const { data: roomTypes = [], isLoading: isLoadingRoomTypes } = useRoomTypes(propertyId);
  const { data: rooms = [], isLoading: isLoadingRooms } = useRooms(propertyId);

  const updateStatusMutation = useUpdateRoomStatus(propertyId);
  const deleteRoomMutation = useDeleteRoom(propertyId);

  // Initialize expanded state once roomTypes are loaded
  React.useEffect(() => {
    if (roomTypes.length > 0 && Object.keys(expandedRoomTypes).length === 0) {
      const initial: Record<string, boolean> = {};
      roomTypes.forEach((rt) => {
        initial[rt.id] = true; // Expand all by default
      });
      setExpandedRoomTypes(initial);
    }
  }, [roomTypes]);

  const toggleExpand = (roomTypeId: string) => {
    setExpandedRoomTypes((prev) => ({
      ...prev,
      [roomTypeId]: !prev[roomTypeId],
    }));
  };

  const handleDeleteRoom = async (roomId: string, roomNumber: string) => {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa phòng "${roomNumber}" không? Hành động này không thể hoàn tác.`
    );
    if (confirmed) {
      await deleteRoomMutation.mutateAsync(roomId);
    }
  };

  const handleUpdateStatus = async (roomId: string, status: RoomStatus) => {
    await updateStatusMutation.mutateAsync({ roomId, status });
  };

  // Extract list of all floors for the floor dropdown filter
  const floors = React.useMemo(() => {
    const set = new Set<number>();
    rooms.forEach((r) => {
      if (r.floor !== null && r.floor !== undefined) {
        set.add(r.floor);
      }
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [rooms]);

  // Filter rooms based on search query, floor and status filters
  const filteredRooms = React.useMemo(() => {
    return rooms.filter((room) => {
      const matchesSearch = room.roomNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFloor =
        selectedFloor === 'all' ||
        (room.floor !== null && room.floor !== undefined && String(room.floor) === selectedFloor);
      const matchesStatus = selectedStatus === 'all' || room.status === selectedStatus;

      return matchesSearch && matchesFloor && matchesStatus;
    });
  }, [rooms, searchQuery, selectedFloor, selectedStatus]);

  // Group filtered rooms by room type
  const roomsByRoomType = React.useMemo(() => {
    const groups: Record<string, Room[]> = {};
    roomTypes.forEach((rt) => {
      groups[rt.id] = [];
    });

    filteredRooms.forEach((room) => {
      if (groups[room.roomTypeId]) {
        groups[room.roomTypeId].push(room);
      } else {
        // Fallback in case room type is not pre-populated
        groups[room.roomTypeId] = [room];
      }
    });

    return groups;
  }, [roomTypes, filteredRooms]);

  // Count rooms by status for each room type (based on unfiltered rooms)
  const roomStatusBreakdowns = React.useMemo(() => {
    const breakdowns: Record<string, Record<RoomStatus, number>> = {};

    roomTypes.forEach((rt) => {
      breakdowns[rt.id] = {
        [RoomStatus.AVAILABLE]: 0,
        [RoomStatus.OCCUPIED]: 0,
        [RoomStatus.RESERVED]: 0,
        [RoomStatus.CLEANING]: 0,
        [RoomStatus.MAINTENANCE]: 0,
      };
    });

    rooms.forEach((room) => {
      if (breakdowns[room.roomTypeId]) {
        breakdowns[room.roomTypeId][room.status]++;
      }
    });

    return breakdowns;
  }, [roomTypes, rooms]);

  const isLoading = isLoadingRoomTypes || isLoadingRooms;

  return (
    <div className="space-y-6 mt-4">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Sơ đồ và trạng thái phòng</h2>
          <p className="text-muted-foreground text-sm">
            Xem và thay đổi trạng thái hoạt động của các phòng vật lý.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={roomTypes.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm phòng
        </Button>
      </div>

      {/* Filter and search bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-secondary/35 p-4 rounded-xl border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm số phòng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Floor filter */}
          <div className="w-[140px]">
            <Select value={selectedFloor} onValueChange={setSelectedFloor}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Chọn tầng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả tầng</SelectItem>
                {floors.map((floor) => (
                  <SelectItem key={floor} value={String(floor)}>
                    Tầng {floor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status filter */}
          <div className="w-[180px]">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear filters button */}
          {(searchQuery || selectedFloor !== 'all' || selectedStatus !== 'all') && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearchQuery('');
                setSelectedFloor('all');
                setSelectedStatus('all');
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse border-dashed">
              <div className="h-16 bg-muted rounded-t-xl" />
              <CardContent className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-20 bg-muted/65 rounded-lg" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : roomTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-10 text-center border-2 border-dashed rounded-2xl bg-secondary/10">
          <Layers className="h-12 w-12 text-muted-foreground/60 mb-3" />
          <h3 className="text-lg font-semibold">Chưa có loại phòng</h3>
          <p className="text-muted-foreground text-sm max-w-sm mb-4">
            Bạn cần phải tạo ít nhất một Loại phòng (Room Type) trước khi quản lý các phòng vật lý cụ thể.
          </p>
          <Button asChild>
            <a href={`/properties/${propertyId}/room-types`}>Đi tới Quản lý Loại phòng</a>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {roomTypes.map((rt) => {
            const rtRooms = roomsByRoomType[rt.id] || [];
            const isExpanded = expandedRoomTypes[rt.id];
            const breakdown = roomStatusBreakdowns[rt.id];
            const totalInType = Object.values(breakdown).reduce((a, b) => a + b, 0);

            return (
              <Card key={rt.id} className="overflow-hidden border shadow-sm transition-all duration-200">
                {/* Room Type Header - Expandable */}
                <div
                  onClick={() => toggleExpand(rt.id)}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-secondary/20 hover:bg-secondary/40 cursor-pointer border-b transition-colors select-none gap-3"
                >
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <div>
                      <h3 className="font-semibold text-base flex items-center gap-2">
                        {rt.name}
                        <Badge variant="outline" className="font-normal text-xs px-2 py-0">
                          {totalInType} phòng
                        </Badge>
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND',
                        }).format(rt.basePrice)}{' '}
                        • Tối đa {rt.maxOccupancy} khách
                      </p>
                    </div>
                  </div>

                  {/* Summary of room statuses */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-11 md:pl-0">
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                      const count = breakdown[key as RoomStatus] || 0;
                      if (count === 0) return null;
                      return (
                        <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground border bg-background px-2 py-1 rounded-md">
                          <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                          <span className="font-medium text-foreground">{count}</span>
                          <span>{config.label.split(' ')[0]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Expanded Rooms Grid */}
                {isExpanded && (
                  <CardContent className="p-4 md:p-6 bg-background/50">
                    {rtRooms.length === 0 ? (
                      <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-xl">
                        Không tìm thấy phòng nào khớp với bộ lọc.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {rtRooms.map((room) => {
                          const statusInfo = STATUS_CONFIG[room.status];
                          const StatusIcon = statusInfo.icon;

                          return (
                            <div
                              key={room.id}
                              className="group relative flex flex-col justify-between p-3.5 bg-background border rounded-xl shadow-sm hover:shadow-md hover:border-foreground/30 transition-all duration-200"
                            >
                              {/* Top-Right Quick Actions */}
                              <div className="absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 p-0">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-[180px]">
                                    <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => (
                                      <DropdownMenuItem
                                        key={statusKey}
                                        onClick={() => handleUpdateStatus(room.id, statusKey as RoomStatus)}
                                        disabled={room.status === statusKey || updateStatusMutation.isPending}
                                        className="flex items-center justify-between"
                                      >
                                        <span className="flex items-center gap-2">
                                          <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                                          {config.label}
                                        </span>
                                      </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteRoom(room.id, room.roomNumber)}
                                      disabled={deleteRoomMutation.isPending || room.status === RoomStatus.OCCUPIED}
                                      className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2 cursor-pointer"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Xóa phòng
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              {/* Card Content */}
                              <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="font-bold text-lg tracking-tight group-hover:text-primary transition-colors">
                                      Phòng {room.roomNumber}
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                      {room.floor !== null && room.floor !== undefined ? (
                                        <span>Tầng {room.floor}</span>
                                      ) : (
                                        <span className="italic text-[10px]">Chưa cài tầng</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Room Notes */}
                                {room.notes && (
                                  <div className="flex items-start gap-1 text-[11px] text-muted-foreground/85 line-clamp-2 bg-secondary/20 p-1.5 rounded border border-secondary">
                                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/60" />
                                    <span>{room.notes}</span>
                                  </div>
                                )}
                              </div>

                              {/* Interactive Status Indicator */}
                              <div className="mt-3">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      disabled={updateStatusMutation.isPending}
                                      className={`w-full flex items-center justify-center gap-2 border px-2 py-1.5 rounded-lg text-xs font-semibold select-none cursor-pointer outline-none transition-all ${statusInfo.color}`}
                                    >
                                      <StatusIcon className="h-3.5 w-3.5" />
                                      {statusInfo.label}
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="center" className="w-[180px]">
                                    <DropdownMenuLabel>Cập nhật trạng thái</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => (
                                      <DropdownMenuItem
                                        key={statusKey}
                                        onClick={() => handleUpdateStatus(room.id, statusKey as RoomStatus)}
                                        disabled={room.status === statusKey}
                                        className="flex items-center gap-2"
                                      >
                                        <span className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />
                                        {config.label}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Room Create Dialog */}
      <RoomCreateDialog
        propertyId={propertyId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
