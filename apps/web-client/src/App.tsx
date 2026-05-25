import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  Calendar, 
  CreditCard, 
  LogOut, 
  Send, 
  User, 
  Clock, 
  HelpCircle, 
  Coffee, 
  Truck, 
  Sparkles, 
  CheckCircle,
  AlertTriangle,
  Receipt,
  FileText,
  MessageSquare,
  Timer
} from 'lucide-react';

interface Guest {
  id: string;
  fullName: string;
  email: string;
  phone: string;
}

function BookingDemo({ token, propertyId }: { token: string, propertyId: string }) {
  const [hold, setHold] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!hold?.expiresAt) return;
    const update = () => {
      const diff = new Date(hold.expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Đã hết hạn');
        setHold(null); // hold expired
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m} phút ${s} giây`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [hold]);

  const handleCreateHold = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/bookings/hold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          propertyId,
          // Sending dummy data for demo
          roomTypeId: 'a-dummy-room-type-id-would-be-here', 
          nights: [new Date().toISOString().split('T')[0]]
        })
      });
      const data = await res.json();
      if (res.ok) {
        setHold(data);
      } else {
        alert(data.message || 'Hết phòng trống (ROOM_UNAVAILABLE).');
      }
    } catch (e) {
      alert('Lỗi tạo hold');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm max-w-2xl mx-auto text-center space-y-6">
      <h2 className="text-xl font-bold">Thử nghiệm Đặt phòng trực tuyến</h2>
      <p className="text-slate-500 text-sm">Giả lập việc khách hàng chọn phòng và nhận được hold đếm ngược để thanh toán.</p>
      
      {!hold ? (
        <button 
          onClick={handleCreateHold} 
          disabled={loading}
          className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md flex items-center justify-center gap-2 mx-auto"
        >
          {loading ? 'Đang giữ chỗ...' : 'Giữ chỗ phòng Deluxe'}
        </button>
      ) : (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl space-y-4">
          <Timer className="h-10 w-10 text-amber-500 mx-auto animate-pulse" />
          <h3 className="text-lg font-bold text-slate-800">Phòng của bạn đang được giữ</h3>
          <p className="text-sm text-slate-600">
            Vui lòng hoàn tất thanh toán trong khoảng thời gian quy định để xác nhận đặt phòng.
          </p>
          <div className="bg-white px-6 py-4 rounded-lg inline-block shadow-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Thời gian còn lại</p>
            <p className="text-2xl font-black text-amber-600">{timeLeft}</p>
          </div>
          <div className="pt-4">
            <button className="bg-amber-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-amber-600 shadow-md">
              Tiến hành Thanh toán
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface Booking {
  id: string;
  propertyId: string;
  roomTypeId: string;
  roomId: string | null;
  status: string;
  checkIn: string;
  checkOut: string;
  paymentStatus: string;
  totalAmount: number | null;
}

interface Invoice {
  id: string;
  bookingId: string;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string | null;
  vnpayTransactionId: string | null;
  issuedAt: string;
  paidAt: string | null;
}

interface Task {
  id: string;
  bookingId: string;
  type: 'CLEANING' | 'FOOD' | 'TRANSPORT' | 'OTHER';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  guestNote: string | null;
  staffReport: string | null;
  createdAt: string;
  updatedAt: string;
}

function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tight text-emerald-600">MANGO HOTEL</span>
          </div>
          <nav className="hidden md:flex gap-8">
            <Link to="/" className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors">Trang chủ</Link>
            <Link to="/my-stay" className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors">My Stay</Link>
          </nav>
          <Link to="/my-stay" className="bg-emerald-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-emerald-700 shadow-md shadow-emerald-100 transition-all">
            Xem Đặt Phòng của tôi
          </Link>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <div className="relative h-[650px] bg-slate-950 flex items-center justify-center">
          <div className="absolute inset-0 overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1542314831-c6a4d27ce66f?auto=format&fit=crop&q=80" 
              alt="Hotel exterior" 
              className="w-full h-full object-cover opacity-50 scale-105 transition-transform duration-1000"
            />
          </div>
          <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
            <span className="inline-block bg-emerald-500/20 text-emerald-400 text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4 border border-emerald-400/30">
              Welcome to Luxury
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight leading-tight">
              Trải nghiệm nghỉ dưỡng đẳng cấp quốc tế
            </h1>
            <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Khám phá không gian sang trọng tinh tế và dịch vụ phòng trực tuyến 24/7 tuyệt vời tại Mango Hotel.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/my-stay" className="bg-emerald-600 text-white px-8 py-4 rounded-full font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-900/30 transition-all text-center">
                Đăng nhập My Stay
              </Link>
              <a href="#about" className="border border-white/30 text-white hover:bg-white/10 backdrop-blur-sm px-8 py-4 rounded-full font-bold transition-all text-center">
                Tìm hiểu thêm
              </a>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div id="about" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Cổng thông tin My Stay trực quan
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto mb-16 text-lg">
              Giúp bạn quản lý kỳ nghỉ của mình một cách thông minh từ đặt phòng, thanh toán, đến yêu cầu các dịch vụ tiện ích ngay tại phòng của mình.
            </p>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm text-left">
                <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-6 shadow-inner">
                  <Calendar className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Thông tin lưu trú</h3>
                <p className="text-slate-500">Xem nhanh mã phòng nghỉ, thời gian check-in, check-out và quản lý thông tin khách trú.</p>
              </div>

              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm text-left">
                <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 mb-6 shadow-inner">
                  <CreditCard className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Thanh toán an toàn</h3>
                <p className="text-slate-500">Xem hoá đơn và thanh toán nhanh chóng, an toàn qua cổng VNPay với chữ ký số bảo mật.</p>
              </div>

              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm text-left">
                <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 mb-6 shadow-inner">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Dịch vụ phòng 24/7</h3>
                <p className="text-slate-500">Yêu cầu dọn phòng, giặt là, gọi món hoặc đặt xe. Trạng thái yêu cầu được cập nhật real-time.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-slate-900 text-slate-400 py-16 text-center border-t border-slate-800">
        <p className="text-sm font-semibold tracking-wider text-slate-500 uppercase mb-4">Mango Hotel & Resort</p>
        <p className="text-xs">&copy; 2026 Mango Hotel. All rights reserved. Powered by NestJS & React.</p>
      </footer>
    </div>
  );
}

function MyStay() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Auth state
  const [token, setToken] = useState<string | null>(localStorage.getItem('guest_token'));
  const [guest, setGuest] = useState<Guest | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  
  // Login form state
  const [bookingIdInput, setBookingIdInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  
  // Dashboard details state
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<'stay' | 'invoice' | 'service'>('stay');
  
  // Loading & Error states
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<{ status: 'success' | 'failed' | 'error', text: string } | null>(null);
  const [payLoading, setPayLoading] = useState(false);

  // New service request form
  const [serviceType, setServiceType] = useState<'CLEANING' | 'FOOD' | 'TRANSPORT' | 'OTHER'>('CLEANING');
  const [guestNote, setGuestNote] = useState('');
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceSuccess, setServiceSuccess] = useState(false);

  // Notifications State
  interface ToastMsg {
    id: number;
    title: string;
    message: string;
    type: 'info' | 'success';
  }
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const addToast = (title: string, message: string, type: 'info' | 'success' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Request native notification permission on load
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  // Socket connection
  const socketRef = useRef<Socket | null>(null);

  const refetchInvoice = async (bookingId: string, authToken: string) => {
    const invoiceRes = await fetch(`/api/v1/invoices/booking/${bookingId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (invoiceRes.ok) {
      const invoiceData = await invoiceRes.json();
      setInvoice(invoiceData);
    }
  };

  // Handle VNPay redirect query parameters (?payment=success|failed|error)
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (!paymentStatus) return;

    setActiveTab('invoice');

    if (paymentStatus === 'success') {
      setPaymentMessage({
        status: 'success',
        text: 'Thanh toán hoá đơn thành công qua cổng VNPay!',
      });
    } else if (paymentStatus === 'failed') {
      setPaymentMessage({
        status: 'failed',
        text: 'Thanh toán thất bại hoặc bị hủy giao dịch.',
      });
    } else if (paymentStatus === 'error') {
      const reason = searchParams.get('reason');
      const reasonText =
        reason === 'invalid_signature'
          ? 'Chữ ký VNPay không hợp lệ.'
          : reason === 'server_error'
            ? 'Lỗi xác nhận thanh toán trên server.'
            : reason || 'Không xác định';
      setPaymentMessage({ status: 'error', text: `Lỗi giao dịch: ${reasonText}` });
    }

    const clearParams = () => {
      const next = new URLSearchParams(searchParams);
      next.delete('payment');
      next.delete('reason');
      setSearchParams(next, { replace: true });
    };

    if (paymentStatus === 'success' && token && booking) {
      refetchInvoice(booking.id, token).finally(clearParams);
    } else if (paymentStatus !== 'success') {
      clearParams();
    }
  }, [searchParams, setSearchParams, token, booking]);

  // Decode/parse local storage auth details on load
  useEffect(() => {
    const savedGuest = localStorage.getItem('guest_data');
    const savedBooking = localStorage.getItem('booking_data');
    if (token && savedGuest && savedBooking) {
      setGuest(JSON.parse(savedGuest));
      setBooking(JSON.parse(savedBooking));
    }
  }, [token]);

  // Fetch dashboard data (Invoices, Tasks) once authenticated
  useEffect(() => {
    if (!token || !booking) return;

    const fetchData = async () => {
      setDataLoading(true);
      try {
        // Fetch Invoice
        const invoiceRes = await fetch(`/api/v1/invoices/booking/${booking.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (invoiceRes.ok) {
          const invoiceData = await invoiceRes.json();
          setInvoice(invoiceData);
        } else {
          setInvoice(null);
        }

        // Fetch Tasks
        const tasksRes = await fetch(`/api/v1/tasks?bookingId=${booking.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json();
          setTasks(tasksData);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();

    // Establish WebSocket Connection
    socketRef.current = io('/tasks', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to tasks socket');
      socketRef.current?.emit('join_booking', booking.id);
    });

    socketRef.current.on('task_changed', (data: { event: 'created' | 'updated', task: Task }) => {
      console.log('Socket event received:', data);
      
      // Update tasks list real-time
      setTasks((prevTasks) => {
        const index = prevTasks.findIndex((t) => t.id === data.task.id);
        if (index > -1) {
          const updated = [...prevTasks];
          updated[index] = data.task;
          return updated;
        }
        return [data.task, ...prevTasks];
      });

      // Show native and in-app notifications for updates
      if (data.event === 'updated') {
        const typeLabel = data.task.type === 'CLEANING' ? 'Dọn phòng' : data.task.type === 'FOOD' ? 'Đồ ăn' : data.task.type === 'TRANSPORT' ? 'Đưa đón' : 'Dịch vụ khác';
        const statusLabel = data.task.status === 'IN_PROGRESS' ? 'đang xử lý' : data.task.status === 'COMPLETED' ? 'đã hoàn thành' : 'đã huỷ';
        const title = `Mango Hotel - Dịch vụ phòng`;
        const body = `Yêu cầu [${typeLabel}] của bạn ${statusLabel}!`;
        
        // In-app Toast
        addToast(title, body, 'info');

        // Native push notification (if allowed)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, { body });
        }
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token, booking]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingIdInput || !phoneInput) {
      setAuthError('Vui lòng điền đầy đủ Booking ID và Số điện thoại');
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      const response = await fetch('/api/v1/auth/guest-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: bookingIdInput.trim(), phone: phoneInput.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        setAuthError(result.message || 'Đăng nhập thất bại. Hãy kiểm tra lại thông tin.');
        return;
      }

      localStorage.setItem('guest_token', result.accessToken);
      localStorage.setItem('guest_data', JSON.stringify(result.guest));
      localStorage.setItem('booking_data', JSON.stringify(result.booking));
      
      setToken(result.accessToken);
      setGuest(result.guest);
      setBooking(result.booking);
    } catch (err) {
      setAuthError('Lỗi kết nối máy chủ. Vui lòng thử lại sau.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('guest_token');
    localStorage.removeItem('guest_data');
    localStorage.removeItem('booking_data');
    setToken(null);
    setGuest(null);
    setBooking(null);
    setInvoice(null);
    setTasks([]);
    navigate('/my-stay');
  };

  const handlePayVNPay = async () => {
    if (!invoice || !token) return;
    setPayLoading(true);
    try {
      const res = await fetch('/api/v1/payment/vnpay/create-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      const data = await res.json();
      if (res.ok && data?.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }
      setPaymentMessage({
        status: 'error',
        text: data?.message || 'Không tạo được liên kết thanh toán VNPay.',
      });
      setActiveTab('invoice');
    } catch {
      setPaymentMessage({
        status: 'error',
        text: 'Không kết nối được máy chủ thanh toán. Kiểm tra API đang chạy.',
      });
      setActiveTab('invoice');
    } finally {
      setPayLoading(false);
    }
  };

  const handleRequestService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    setServiceLoading(true);
    setServiceSuccess(false);

    try {
      const response = await fetch('/api/v1/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          bookingId: booking.id,
          type: serviceType,
          guestNote: guestNote.trim()
        })
      });

      const result = await response.json();

      if (response.ok) {
        setGuestNote('');
        setServiceSuccess(true);
        // Automatically appended via WebSocket client message, but safe to fetch or append
        setTasks((prev) => {
          if (prev.find(t => t.id === result.id)) return prev;
          return [result, ...prev];
        });
      } else {
        alert(`Lỗi: ${result.message || 'Không thể tạo yêu cầu'}`);
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ.');
    } finally {
      setServiceLoading(false);
    }
  };

  // If NOT authenticated, show login form
  if (!token || !guest || !booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200/80 max-w-md w-full">
          <div className="text-center mb-8">
            <span className="text-xs font-bold text-emerald-600 tracking-wider uppercase bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              Mango Guest Portal
            </span>
            <h1 className="text-3xl font-black text-slate-950 mt-4 mb-2 tracking-tight">CỔNG LƯU TRÚ</h1>
            <p className="text-slate-500 text-sm">Nhập thông tin đặt phòng để truy cập dịch vụ</p>
          </div>
          
          {authError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-lg text-sm mb-6 flex items-start gap-2 animate-pulse">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Mã Đặt Phòng (Booking ID)</label>
              <input 
                type="text" 
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                placeholder="VD: booking_uuid_..."
                value={bookingIdInput}
                onChange={(e) => setBookingIdInput(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Số điện thoại khách hàng</label>
              <input 
                type="tel" 
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="Số đt lúc đăng ký phòng"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                required
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-emerald-600 text-white py-3.5 px-4 rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 hover:shadow-none transition-all duration-300 flex items-center justify-center gap-2"
              disabled={authLoading}
            >
              {authLoading ? 'Đang xác thực...' : 'Vào cổng thông tin'}
            </button>
          </form>
          
          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <Link to="/" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors">&larr; Trở về Trang chủ</Link>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Guest Dashboard
  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Toast Notifications Container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto w-72 bg-white border border-slate-200 shadow-xl rounded-xl p-4 transition-all duration-300 transform translate-y-0 opacity-100">
            <div className="flex items-start gap-3">
              <div className="text-emerald-500 mt-0.5"><MessageSquare className="h-5 w-5" /></div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{t.title}</h4>
                <p className="text-xs text-slate-600 mt-1">{t.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Banner / Message Alert */}
      {paymentMessage && (
        <div className={`text-center py-4 px-6 text-sm font-bold text-white shadow-md animate-bounce flex items-center justify-center gap-2 ${
          paymentMessage.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
        }`}>
          {paymentMessage.status === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          <span>{paymentMessage.text}</span>
          <button 
            className="ml-4 underline hover:text-slate-100" 
            onClick={() => setPaymentMessage(null)}
          >
            Đóng
          </button>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <span className="text-xl font-black tracking-tight text-emerald-600">MANGO PORTAL</span>
            <div className="h-6 w-[1px] bg-slate-200 hidden sm:block"></div>
            <div className="flex items-center gap-2 text-slate-700">
              <User className="h-5 w-5 text-slate-400" />
              <span className="font-bold text-sm">{guest.fullName}</span>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-mono">BKG ID: {booking.id.substring(0,8)}...</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 px-4 py-2 rounded-full text-sm font-semibold transition-all border border-slate-200"
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mb-8 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('stay')}
            className={`py-4 px-6 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'stay' 
                ? 'border-emerald-600 text-emerald-600' 
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calendar className="h-5 w-5" />
            Kỳ nghỉ của tôi
          </button>
          <button
            onClick={() => setActiveTab('invoice')}
            className={`py-4 px-6 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'invoice' 
                ? 'border-emerald-600 text-emerald-600' 
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Receipt className="h-5 w-5" />
            Hoá đơn & Thanh toán
          </button>
          <button
            onClick={() => setActiveTab('service')}
            className={`py-4 px-6 font-bold text-sm border-b-2 transition-all flex items-center gap-2 relative ${
              activeTab === 'service' 
                ? 'border-emerald-600 text-emerald-600' 
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Coffee className="h-5 w-5" />
            Dịch vụ phòng
            {tasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length > 0 && (
              <span className="absolute top-2 right-1 h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('book')}
            className={`py-4 px-6 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'book' 
                ? 'border-emerald-600 text-emerald-600' 
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sparkles className="h-5 w-5" />
            Đặt phòng trực tuyến (Demo)
          </button>
        </div>

        {/* Tab Contents */}
        {dataLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 mt-4 text-sm font-semibold">Đang cập nhật thông tin...</p>
          </div>
        ) : (
          <>
            {activeTab === 'stay' && (
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">Chi tiết đặt phòng</h2>
                    <p className="text-slate-500 text-sm">Thông tin tổng quan về lưu trú của bạn</p>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mã Phòng</p>
                      <p className="text-lg font-black text-slate-900">{booking.roomId ? `Phòng ${booking.roomId}` : 'Chưa xếp phòng (Đang xử lý)'}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Trạng thái đặt phòng</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-1 ${
                        booking.status === 'CHECKED_IN' ? 'bg-emerald-100 text-emerald-700' :
                        booking.status === 'CHECKED_OUT' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl flex items-center gap-3">
                      <Clock className="h-8 w-8 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Check-in</p>
                        <p className="text-sm font-bold text-slate-800">{new Date(booking.checkIn).toLocaleDateString('vi-VN')}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl flex items-center gap-3">
                      <Clock className="h-8 w-8 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Check-out</p>
                        <p className="text-sm font-bold text-slate-800">{new Date(booking.checkOut).toLocaleDateString('vi-VN')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sidebar area: Check-in QR */}
                <div className="space-y-6">
                  {booking.status === 'CONFIRMED' && booking.checkinToken && (
                    <div className="bg-white rounded-2xl p-6 border border-emerald-200 shadow-sm text-center">
                      <h3 className="text-lg font-bold text-slate-900 mb-2">Check-in Điện tử</h3>
                      <p className="text-xs text-slate-500 mb-4">
                        Xuất trình mã này tại quầy lễ tân hoặc Kiosk để nhận phòng nhanh.
                      </p>
                      <div className="bg-white p-4 inline-block rounded-xl border border-slate-200 shadow-sm mx-auto">
                        <QRCodeCanvas value={booking.checkinToken} size={160} level="H" />
                      </div>
                      {booking.checkinTokenExpiresAt && (
                        <p className="text-xs text-emerald-600 mt-4 font-bold bg-emerald-50 py-1.5 rounded-lg border border-emerald-100">
                          Hiệu lực đến: {new Date(booking.checkinTokenExpiresAt).toLocaleString('vi-VN')}
                        </p>
                      )}
                    </div>
                  )}
                  {booking.status === 'CONFIRMED' && !booking.checkinToken && (
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-center">
                      <h3 className="text-lg font-bold text-slate-900 mb-2">Check-in Điện tử</h3>
                      <p className="text-sm text-slate-500">Mã QR Check-in chưa được tạo. Vui lòng liên hệ lễ tân.</p>
                    </div>
                  )}
                  
                  <div className="bg-gradient-to-br from-slate-900 to-emerald-950 rounded-2xl p-6 text-white shadow-xl flex flex-col justify-between h-[300px]">
                  <div>
                    <h3 className="text-2xl font-black tracking-tight mb-2">Grand Luxury Resort</h3>
                    <p className="text-slate-300 text-xs leading-relaxed">123 Vo Nguyen Giap, Da Nang, Viet Nam</p>
                  </div>
                  <div className="border-t border-white/10 pt-4">
                    <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Hỗ trợ khách hàng</p>
                    <p className="text-sm font-semibold mt-1">Đường dây nóng: (0236) 3888 999</p>
                    <p className="text-xs text-slate-400">Chúng tôi hỗ trợ bạn mọi lúc mọi nơi trong kỳ nghỉ.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'invoice' && (
              <div className="mx-auto max-w-3xl space-y-6">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                  <div className="mb-6 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900">
                        Hoá đơn & Thanh toán
                      </h2>
                      <p className="text-sm text-slate-500">
                        Thanh toán online qua VNPay Sandbox — sau khi hoàn tất bạn sẽ được
                        chuyển về trang này.
                      </p>
                    </div>
                    {invoice && (
                      <span
                        className={`inline-flex w-fit px-3 py-1 rounded-full text-xs font-bold ${
                          invoice.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {invoice.paymentStatus === 'PAID'
                          ? 'Đã thanh toán'
                          : 'Chờ thanh toán'}
                      </span>
                    )}
                  </div>

                  {!invoice ? (
                    <div className="py-10 text-center text-slate-500">
                      <FileText className="mx-auto mb-3 h-12 w-12 opacity-35" />
                      <p>Chưa có hoá đơn cho đặt phòng này.</p>
                      <p className="mt-1 text-xs">
                        Liên hệ lễ tân để xuất hoá đơn trước khi thanh toán online.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 p-4">
                          <p className="text-xs font-bold uppercase text-slate-400">
                            Mã hoá đơn
                          </p>
                          <p className="mt-1 font-mono text-sm font-semibold text-slate-700">
                            {invoice.id}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-4">
                          <p className="text-xs font-bold uppercase text-slate-400">
                            Ngày xuất
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {new Date(invoice.issuedAt).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-6">
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                          Số tiền cần thanh toán
                        </p>
                        <p className="mt-2 text-4xl font-black text-slate-900">
                          {new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                          }).format(invoice.totalAmount)}
                        </p>

                        {invoice.paymentStatus !== 'PAID' ? (
                          <div className="mt-6 space-y-3">
                            <p className="text-sm text-slate-600">
                              Bạn sẽ được chuyển sang cổng VNPay. Sau khi thanh toán,
                              hệ thống tự quay về{' '}
                              <span className="font-mono text-xs">/my-stay</span>.
                            </p>
                            <button
                              type="button"
                              onClick={handlePayVNPay}
                              disabled={payLoading}
                              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                            >
                              <CreditCard className="h-5 w-5" />
                              {payLoading
                                ? 'Đang tạo liên kết VNPay...'
                                : 'Thanh toán qua VNPay'}
                            </button>
                          </div>
                        ) : (
                          <div className="mt-4 flex items-start gap-3 rounded-xl bg-white p-4 text-emerald-700">
                            <CheckCircle className="h-6 w-6 shrink-0" />
                            <div>
                              <p className="text-sm font-bold">Đã thanh toán thành công</p>
                              <p className="text-xs text-slate-500">
                                Phương thức:{' '}
                                {invoice.paymentMethod === 'VNPAY'
                                  ? 'VNPay (Online)'
                                  : invoice.paymentMethod || '—'}
                              </p>
                              {invoice.paidAt && (
                                <p className="mt-1 text-xs text-slate-500">
                                  Thời gian:{' '}
                                  {new Date(invoice.paidAt).toLocaleString('vi-VN')}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-center text-xs text-slate-400">
                  Môi trường dev: đảm bảo API chạy tại{' '}
                  <span className="font-mono">localhost:3000</span> và web client tại{' '}
                  <span className="font-mono">localhost:8080</span>
                </p>
              </div>
            )}

            {activeTab === 'service' && (
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Request Form */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Gửi yêu cầu dịch vụ</h2>
                    <p className="text-slate-500 text-sm">Chúng tôi phục vụ nhanh chóng và trực tiếp đến phòng bạn</p>
                  </div>

                  {serviceSuccess && (
                    <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                      <Sparkles className="h-5 w-5 shrink-0" />
                      <span>Đã gửi yêu cầu dịch vụ thành công!</span>
                    </div>
                  )}

                  <form className="space-y-4" onSubmit={handleRequestService}>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Loại yêu cầu</label>
                      <select
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={serviceType}
                        onChange={(e) => setServiceType(e.target.value as any)}
                      >
                        <option value="CLEANING">Dọn phòng (Housecleaning)</option>
                        <option value="FOOD">Đặt đồ ăn / Thức uống (Dining Order)</option>
                        <option value="TRANSPORT">Đặt xe đưa đón / Di chuyển (Transport)</option>
                        <option value="OTHER">Yêu cầu khác (Other Request)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Ghi chú chi tiết</label>
                      <textarea
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[100px]"
                        placeholder="VD: Cần bổ sung 2 khăn tắm, dọn phòng vào lúc 14h..."
                        value={guestNote}
                        onChange={(e) => setGuestNote(e.target.value)}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={serviceLoading}
                      className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-md shadow-slate-200"
                    >
                      <Send className="h-4 w-4" />
                      {serviceLoading ? 'Đang gửi...' : 'Gửi yêu cầu ngay'}
                    </button>
                  </form>
                </div>

                {/* History List */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Lịch sử yêu cầu dịch vụ</h2>
                    <p className="text-slate-500 text-sm">Theo dõi tiến độ xử lý thời gian thực</p>
                  </div>

                  {tasks.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                      <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Bạn chưa gửi bất kỳ yêu cầu dịch vụ nào trong phòng.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                      {tasks.map((task) => (
                        <div key={task.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all hover:bg-slate-50">
                          <div className="flex items-start gap-3">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                              task.type === 'CLEANING' ? 'bg-emerald-100 text-emerald-600' :
                              task.type === 'FOOD' ? 'bg-amber-100 text-amber-600' :
                              task.type === 'TRANSPORT' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {task.type === 'CLEANING' ? <Sparkles className="h-5 w-5" /> :
                               task.type === 'FOOD' ? <Coffee className="h-5 w-5" /> :
                               task.type === 'TRANSPORT' ? <Truck className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">
                                {task.type === 'CLEANING' ? 'Dọn phòng' :
                                 task.type === 'FOOD' ? 'Gọi đồ ăn' :
                                 task.type === 'TRANSPORT' ? 'Xe đưa đón' : 'Yêu cầu khác'}
                              </p>
                              <p className="text-slate-500 text-xs line-clamp-1">{task.guestNote}</p>
                              {task.staffReport && (
                                <p className="text-emerald-600 text-xs mt-1 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">Staff: {task.staffReport}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-end gap-2 shrink-0">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              task.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                              task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 animate-pulse' :
                              task.status === 'CANCELLED' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {task.status === 'COMPLETED' ? 'Hoàn thành' :
                               task.status === 'IN_PROGRESS' ? 'Đang làm' :
                               task.status === 'CANCELLED' ? 'Đã hủy' : 'Chờ xử lý'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(task.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(task.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {activeTab === 'book' && <BookingDemo token={token} propertyId={booking.propertyId} />}
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/my-stay" element={<MyStay />} />
      <Route path="*" element={<div className="min-h-screen flex items-center justify-center text-slate-500 font-bold">404 - Trang không tồn tại</div>} />
    </Routes>
  );
}
