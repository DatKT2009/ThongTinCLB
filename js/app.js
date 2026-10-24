/**
 * Hệ thống Quản Lý & Thu Thập Thông Tin CLB TNTN Trống Đồng
 * Trường Cao đẳng Long An - Cơ sở Đức Hoà
 * Đoàn Bộ phận Cơ sở Đức Hoà
 */

let members = [];
let filteredMembers = [];
let currentPage = 1;
const itemsPerPage = 8;
let selectedMemberIds = new Set();

// Biểu đồ Chart.js instances
let deptChartInstance = null;
let roleChartInstance = null;
let genderChartInstance = null;

// ==================== CẤU HÌNH & XỬ LÝ ẢNH ĐẠI DIỆN THÀNH VIÊN ====================
const DEFAULT_AVATAR = 'assets/logo-clb-trong-dong.jpg';

// Chuẩn hóa và tự động chuyển đổi các định dạng link ảnh (đặc biệt hỗ trợ Google Drive, Dropbox, Base64)
function normalizeAvatarUrl(url) {
  if (!url || typeof url !== 'string') return '';
  let trimmed = url.trim();
  if (!trimmed) return '';

  // Nếu là Data URL (ảnh tải trực tiếp từ máy dạng base64) hoặc ảnh nội bộ trong thư mục assets
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('assets/')) {
    return trimmed;
  }

  // Tự động chuyển đổi các dạng link chia sẻ từ Google Drive sang link xem ảnh trực tiếp (Google User Content CDN)
  // Ví dụ: https://drive.google.com/file/d/1A2B3C.../view?usp=sharing hoặc open?id=...
  const driveFileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch && driveFileMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveFileMatch[1]}`;
  }
  const driveIdMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (driveIdMatch && driveIdMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveIdMatch[1]}`;
  }

  // Dropbox: đổi ?dl=0 sang ?raw=1 để tải ảnh trực tiếp
  if (trimmed.includes('dropbox.com') && trimmed.includes('dl=0')) {
    return trimmed.replace('dl=0', 'raw=1');
  }

  // Thêm giao thức nếu bị thiếu
  if (trimmed.startsWith('//')) {
    return 'https:' + trimmed;
  }
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return 'https://' + trimmed;
  }

  return trimmed;
}

// Lấy link avatar an toàn cho thành viên, thay thế các ảnh mẫu người lạ cũ bằng Logo CLB
function getMemberAvatar(member) {
  if (member && member.avatar) {
    const norm = normalizeAvatarUrl(member.avatar);
    // Loại bỏ triệt để ảnh mẫu Unsplash người nước ngoài cũ
    if (norm.includes('photo-1535713875002') || norm.includes('photo-1534528741775') || norm.includes('photo-1539571696357')) {
      return DEFAULT_AVATAR;
    }
    if (norm) return norm;
  }
  return DEFAULT_AVATAR;
}

// Xử lý nén & chuyển file ảnh từ máy tính/điện thoại sang base64 để lưu trực tiếp vào LocalStorage
function handleAvatarFileUpload(file, targetInputId, previewImgId) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    Swal.fire('Lỗi định dạng', 'Vui lòng chọn một file hình ảnh (JPG, PNG, WEBP...)!', 'warning');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 400;
      const MAX_HEIGHT = 400;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

      const input = document.getElementById(targetInputId);
      if (input) input.value = dataUrl;
      const preview = document.getElementById(previewImgId);
      if (preview) preview.src = dataUrl;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Tự động quét và làm sạch các avatar mẫu cũ trong dữ liệu đã lưu
function sanitizeStoredAvatars() {
  let changed = false;
  members.forEach(m => {
    if (m.avatar && (m.avatar.includes('photo-1535713875002') || m.avatar.includes('photo-1534528741775') || m.avatar.includes('photo-1539571696357'))) {
      m.avatar = DEFAULT_AVATAR;
      changed = true;
    } else if (m.avatar) {
      const normalized = normalizeAvatarUrl(m.avatar);
      if (normalized !== m.avatar) {
        m.avatar = normalized;
        changed = true;
      }
    }
  });
  if (changed) {
    saveMembersToStorage(members);
  }
}

// ==================== HỆ THỐNG XÁC THỰC & PHÂN QUYỀN (ADMIN AUTH) ====================
const ADMIN_STORAGE_SESSION = 'clb_admin_session';
const ADMIN_STORAGE_CREDENTIALS = 'clb_admin_credentials';

// Lấy thông tin tài khoản admin từ localStorage (mặc định: TrongDong2@26 / trongdong2026)
function getAdminCredentials() {
  const saved = localStorage.getItem(ADMIN_STORAGE_CREDENTIALS);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Tự động nâng cấp nếu còn lưu tài khoản mẫu cũ 'admin'
      if (parsed && (parsed.username === 'admin' || !parsed.username)) {
        const updated = { username: 'TrongDong2@26', password: 'trongdong2026' };
        saveAdminCredentials(updated);
        return updated;
      }
      return parsed;
    } catch (e) {
      console.error(e);
    }
  }
  const defaultCreds = { username: 'TrongDong2@26', password: 'trongdong2026' };
  saveAdminCredentials(defaultCreds);
  return defaultCreds;
}

function saveAdminCredentials(creds) {
  localStorage.setItem(ADMIN_STORAGE_CREDENTIALS, JSON.stringify(creds));
}

// Kiểm tra quyền Admin hiện tại
function isAdmin() {
  return sessionStorage.getItem(ADMIN_STORAGE_SESSION) === 'true';
}

function setAdminSession(status) {
  if (status) {
    sessionStorage.setItem(ADMIN_STORAGE_SESSION, 'true');
  } else {
    sessionStorage.removeItem(ADMIN_STORAGE_SESSION);
  }
}

// Thiết lập sự kiện cho modal đăng nhập & đổi mật khẩu
function setupAuthSystem() {
  const loginForm = document.getElementById('adminLoginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleAdminLogin);
  }

  const changePassForm = document.getElementById('changePasswordForm');
  if (changePassForm) {
    changePassForm.addEventListener('submit', handleChangePassword);
  }
}

// Cập nhật giao diện Header theo trạng thái Auth
function updateAuthUI() {
  const container = document.getElementById('authHeaderContainer');
  if (!container) return;

  if (isAdmin()) {
    container.innerHTML = `
      <div class="flex items-center space-x-1.5 sm:space-x-2 bg-gradient-to-r from-amber-500/25 to-amber-600/25 border border-amber-300/40 rounded-xl px-2.5 py-1.5 backdrop-blur-md shadow-sm">
        <span class="inline-flex items-center text-amber-300 font-extrabold text-xs">
          <i class="fa-solid fa-crown text-amber-400 mr-1.5 text-sm"></i>
          <span>Admin BCN</span>
        </span>
        <span class="text-white/40 text-xs">|</span>
        <button type="button" onclick="openChangePasswordModal()" title="Đổi mật khẩu Admin"
          class="p-1 text-sky-200 hover:text-white hover:bg-white/15 rounded-lg text-xs transition-colors">
          <i class="fa-solid fa-key"></i>
        </button>
        <button type="button" onclick="handleAdminLogout()" title="Đăng xuất khỏi quyền Admin"
          class="px-2 py-0.5 text-xs text-rose-100 hover:text-white bg-rose-500/50 hover:bg-rose-600/70 rounded-lg transition-colors font-medium flex items-center space-x-1">
          <i class="fa-solid fa-right-from-bracket text-[10px]"></i>
          <span>Thoát</span>
        </button>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="flex items-center space-x-1.5">
        <span class="hidden lg:inline-flex items-center text-[11px] text-sky-200 bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/15 backdrop-blur-sm font-medium">
          <i class="fa-solid fa-user mr-1 text-sky-300"></i> Chế độ xem & nhập
        </span>
        <button type="button" onclick="openAdminLoginModal()"
          class="bg-white/15 hover:bg-white/25 text-white font-semibold px-3 py-1.5 rounded-lg text-xs shadow transition-all flex items-center space-x-1.5 border border-amber-400/40 hover:border-amber-300 backdrop-blur-sm">
          <i class="fa-solid fa-lock text-amber-300"></i>
          <span>Đăng Nhập Admin</span>
        </button>
      </div>
    `;
  }
}

// Mở modal Đăng nhập
function openAdminLoginModal() {
  const modal = document.getElementById('adminLoginModal');
  if (modal) {
    modal.classList.remove('hidden');
    const input = document.getElementById('adminUsername');
    if (input) input.focus();
  }
}

// Đóng modal Đăng nhập
function closeAdminLoginModal() {
  const modal = document.getElementById('adminLoginModal');
  if (modal) modal.classList.add('hidden');
}

// Điền nhanh thông tin mặc định
function fillDefaultAdminCredentials() {
  const creds = getAdminCredentials();
  const userInput = document.getElementById('adminUsername');
  const passInput = document.getElementById('adminPassword');
  if (userInput) userInput.value = creds.username;
  if (passInput) passInput.value = creds.password;
}

// Ẩn / hiện mật khẩu
function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!input || !icon) return;

  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  }
}

// Xử lý submit form đăng nhập Admin
function handleAdminLogin(e) {
  e.preventDefault();
  const userInput = document.getElementById('adminUsername').value.trim();
  const passInput = document.getElementById('adminPassword').value;

  const creds = getAdminCredentials();

  if (userInput === creds.username && passInput === creds.password) {
    setAdminSession(true);
    closeAdminLoginModal();
    updateAuthUI();
    renderMemberTable();
    updateBatchActionButtons();

    Swal.fire({
      icon: 'success',
      title: 'Đăng nhập Admin thành công!',
      html: 'Chào mừng <b>Quản trị viên Ban Chủ nhiệm</b>.<br>Bạn hiện có toàn quyền Chỉnh sửa và Xóa thông tin trên hệ thống.',
      confirmButtonColor: '#005baa',
      confirmButtonText: 'Bắt đầu làm việc'
    });
  } else {
    Swal.fire({
      icon: 'error',
      title: 'Đăng nhập thất bại',
      text: 'Tên đăng nhập hoặc mật khẩu không chính xác! (Mặc định: TrongDong2@26 / trongdong2026)',
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Thử lại'
    });
  }
}

// Xử lý đăng xuất
function handleAdminLogout() {
  Swal.fire({
    title: 'Đăng xuất quyền Admin?',
    text: 'Hệ thống sẽ chuyển về chế độ thành viên thông thường (chỉ được xem và nhập thêm thông tin).',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#005baa',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Đăng xuất',
    cancelButtonText: 'Ở lại'
  }).then((res) => {
    if (res.isConfirmed) {
      setAdminSession(false);
      updateAuthUI();
      renderMemberTable();
      updateBatchActionButtons();
      Swal.fire({
        icon: 'info',
        title: 'Đã đăng xuất!',
        text: 'Bạn đang ở chế độ thành viên bình thường.',
        timer: 1800,
        showConfirmButton: false
      });
    }
  });
}

// Mở modal Đổi mật khẩu
function openChangePasswordModal() {
  if (!isAdmin()) {
    promptAdminLogin('đổi mật khẩu quản trị');
    return;
  }
  const modal = document.getElementById('changePasswordModal');
  const form = document.getElementById('changePasswordForm');
  if (form) form.reset();
  if (modal) modal.classList.remove('hidden');
}

function closeChangePasswordModal() {
  const modal = document.getElementById('changePasswordModal');
  if (modal) modal.classList.add('hidden');
}

// Xử lý Đổi mật khẩu
function handleChangePassword(e) {
  e.preventDefault();
  const currentPass = document.getElementById('currentPassword').value;
  const newPass = document.getElementById('newPassword').value;
  const confirmNew = document.getElementById('confirmNewPassword').value;

  const creds = getAdminCredentials();

  if (currentPass !== creds.password) {
    Swal.fire('Lỗi', 'Mật khẩu hiện tại không đúng!', 'error');
    return;
  }

  if (newPass.length < 4) {
    Swal.fire('Lỗi', 'Mật khẩu mới phải có tối thiểu 4 ký tự!', 'warning');
    return;
  }

  if (newPass !== confirmNew) {
    Swal.fire('Lỗi', 'Mật khẩu nhập lại không khớp!', 'warning');
    return;
  }

  creds.password = newPass;
  saveAdminCredentials(creds);
  closeChangePasswordModal();

  Swal.fire({
    icon: 'success',
    title: 'Đổi mật khẩu thành công!',
    text: 'Mật khẩu quản trị viên mới đã được lưu an toàn.',
    confirmButtonColor: '#005baa'
  });
}

// Thông báo nhắc nhở khi tài khoản thường cố tình dùng chức năng Admin
function promptAdminLogin(actionName = 'thực hiện thao tác này') {
  Swal.fire({
    icon: 'warning',
    title: 'Yêu cầu quyền Admin!',
    html: `
      <div class="text-left text-sm space-y-2 text-slate-700">
        <p>Thao tác <b>"${actionName}"</b> chỉ dành riêng cho <b>Quản trị viên (Admin)</b>.</p>
        <div class="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 leading-relaxed">
          <i class="fa-solid fa-circle-exclamation mr-1 text-amber-600"></i>
          Tài khoản thường chỉ có quyền <b>xem</b> và <b>nhập thêm thông tin mới</b>. Không được chỉnh sửa hoặc xóa bớt dữ liệu.
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonColor: '#005baa',
    cancelButtonColor: '#64748b',
    confirmButtonText: '<i class="fa-solid fa-lock-open mr-1.5"></i>Đăng Nhập Admin',
    cancelButtonText: 'Đóng'
  }).then((res) => {
    if (res.isConfirmed) {
      openAdminLoginModal();
    }
  });
}

// ==================== HỆ THỐNG XÉT DUYỆT HỒ SƠ (CHỈ DÀNH CHO ADMIN) ====================

// Gắn sự kiện cho form xét duyệt hồ sơ
function setupApproveSystem() {
  const approveForm = document.getElementById('approveMemberForm');
  if (approveForm) {
    approveForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleApproveMemberSubmit();
    });
  }
}

// Cập nhật số lượng hồ sơ đang chờ xét duyệt
function updatePendingCountBadge() {
  const pendingCount = members.filter(m => m.status === 'Chờ xét duyệt').length;
  const badge = document.getElementById('pendingCountBadge');
  if (badge) {
    badge.textContent = pendingCount;
    if (pendingCount > 0) {
      badge.classList.remove('bg-white', 'text-amber-800');
      badge.classList.add('bg-rose-500', 'text-white', 'animate-pulse');
    } else {
      badge.classList.remove('bg-rose-500', 'text-white', 'animate-pulse');
      badge.classList.add('bg-white', 'text-amber-800');
    }
  }
}

// Lọc nhanh toàn bộ hồ sơ đang chờ duyệt
function filterPendingApproval() {
  switchTab('members');
  const filterStatus = document.getElementById('filterStatus');
  if (filterStatus) {
    filterStatus.value = 'Chờ xét duyệt';
  }
  const searchQuery = document.getElementById('searchQuery');
  if (searchQuery) searchQuery.value = '';
  const filterDept = document.getElementById('filterDepartment');
  if (filterDept) filterDept.value = 'ALL';
  const filterRole = document.getElementById('filterRole');
  if (filterRole) filterRole.value = 'ALL';

  applyFilters();
}

// Mở modal xét duyệt hồ sơ (Chỉ Admin mới mở được)
function openApproveModal(id) {
  if (!isAdmin()) {
    promptAdminLogin('xét duyệt và phê duyệt hồ sơ');
    return;
  }

  const member = members.find(m => m.id === id);
  if (!member) return;

  const modal = document.getElementById('approveMemberModal');
  if (!modal) return;

  document.getElementById('approveMemberId').value = member.id;
  document.getElementById('approveFullName').textContent = member.fullName;
  document.getElementById('approveStudentId').textContent = member.studentId || 'Chưa có MSSV';
  document.getElementById('approveGender').textContent = member.gender || 'Nam';
  document.getElementById('approveBirthDate').textContent = member.birthDate ? formatDate(member.birthDate) : 'Chưa có ngày sinh';
  document.getElementById('approveClass').textContent = member.classGroup || 'Chưa cập nhật';
  document.getElementById('approveMajor').textContent = member.major || 'Chưa cập nhật';
  document.getElementById('approvePhone').textContent = member.phone || 'Chưa cập nhật';
  document.getElementById('approveEmail').textContent = member.email || 'Chưa cập nhật';
  document.getElementById('approveHomeTown').textContent = member.homeTown || 'Chưa cập nhật';
  document.getElementById('approveRegisteredDept').textContent = member.department || 'Ban Hậu cần';
  document.getElementById('approveSkills').textContent = (member.skills && member.skills.length) ? member.skills.join(', ') : (member.notes || 'Không có ghi chú');

  const avatar = document.getElementById('approveAvatar');
  if (avatar) {
    avatar.src = getMemberAvatar(member);
    avatar.onerror = function() {
      this.onerror = null;
      this.src = DEFAULT_AVATAR;
    };
  }

  const statusBadge = document.getElementById('approveCurrentStatusBadge');
  if (statusBadge) {
    if (member.status === 'Chờ xét duyệt') {
      statusBadge.textContent = '⏳ Chờ xét duyệt';
      statusBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300';
    } else {
      statusBadge.textContent = `${member.status} (${member.role})`;
      statusBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300';
    }
  }

  // Chọn sẵn ban theo nguyện vọng
  const deptSelect = document.getElementById('approveDeptSelect');
  if (deptSelect && member.department) {
    deptSelect.value = member.department;
  }

  // Mặc định vai trò sau duyệt
  const roleSelect = document.getElementById('approveRoleSelect');
  if (roleSelect) {
    roleSelect.value = member.role === 'Cộng tác viên' ? 'Thành viên chính thức' : member.role;
  }

  modal.classList.remove('hidden');
}

function closeApproveModal() {
  const modal = document.getElementById('approveMemberModal');
  if (modal) modal.classList.add('hidden');
}

// Xử lý nộp form xét duyệt
function handleApproveMemberSubmit() {
  if (!isAdmin()) {
    promptAdminLogin('phê duyệt hồ sơ thành viên');
    return;
  }

  const id = document.getElementById('approveMemberId').value;
  const target = members.find(m => m.id === id);
  if (!target) return;

  const role = document.getElementById('approveRoleSelect').value;
  const department = document.getElementById('approveDeptSelect').value;
  const notes = document.getElementById('approveNotesInput').value.trim();

  target.status = 'Đang hoạt động';
  target.role = role;
  target.department = department;
  if (notes) {
    target.notes = (target.notes ? target.notes + ' | ' : '') + `[BCN Duyệt: ${notes}]`;
  }

  saveMembersToStorage(members);
  closeApproveModal();
  renderAll();

  // Bắn pháo hoa chúc mừng
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.6 }
  });

  Swal.fire({
    icon: 'success',
    title: 'Phê Duyệt Thành Công!',
    html: `
      <div class="text-left text-sm space-y-1.5 text-slate-700">
        <p>Đã phê duyệt hồ sơ của đồng chí <b>${target.fullName}</b>.</p>
        <p>• Cấp bậc: <b class="text-sky-700">${role}</b></p>
        <p>• Ban sinh hoạt: <b class="text-blue-700">${department}</b></p>
        <p>• Trạng thái: <b class="text-emerald-700">Đang hoạt động</b></p>
      </div>
    `,
    confirmButtonColor: '#005baa',
    confirmButtonText: 'Tuyệt vời'
  });
}

// Từ chối hồ sơ
function rejectCurrentApproveMember() {
  if (!isAdmin()) {
    promptAdminLogin('từ chối tiếp nhận hồ sơ');
    return;
  }

  const id = document.getElementById('approveMemberId').value;
  const target = members.find(m => m.id === id);
  if (!target) return;

  Swal.fire({
    title: 'Xác nhận từ chối hồ sơ?',
    html: `Bạn có chắc chắn không tiếp nhận hồ sơ của ứng viên <b>${target.fullName}</b>?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Đồng ý từ chối',
    cancelButtonText: 'Hủy'
  }).then((res) => {
    if (res.isConfirmed) {
      target.status = 'Đã từ chối';
      saveMembersToStorage(members);
      closeApproveModal();
      renderAll();
      Swal.fire('Đã từ chối!', `Hồ sơ của ${target.fullName} đã chuyển sang trạng thái "Đã từ chối".`, 'info');
    }
  });
}

// Xét duyệt hàng loạt các hồ sơ đã chọn (Admin only)
function approveSelectedMembers() {
  if (!isAdmin()) {
    promptAdminLogin('xét duyệt hàng loạt hồ sơ');
    return;
  }

  if (selectedMemberIds.size === 0) return;

  const targetMembers = members.filter(m => selectedMemberIds.has(m.id));
  const pendingCount = targetMembers.filter(m => m.status === 'Chờ xét duyệt').length;

  Swal.fire({
    title: `Phê duyệt ${selectedMemberIds.size} hồ sơ đã chọn?`,
    html: `
      <div class="text-left text-sm space-y-2 text-slate-700">
        <p>Trong số ${selectedMemberIds.size} hồ sơ được chọn, có <b>${pendingCount}</b> hồ sơ đang chờ xét duyệt.</p>
        <p class="text-xs text-slate-500">Hệ thống sẽ chuyển tất cả sang trạng thái <b>"Đang hoạt động"</b> và nâng cấp các Cộng tác viên lên <b>"Thành viên chính thức"</b>.</p>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#005baa',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Xác nhận phê duyệt',
    cancelButtonText: 'Hủy'
  }).then((res) => {
    if (res.isConfirmed) {
      targetMembers.forEach(m => {
        m.status = 'Đang hoạt động';
        if (m.role === 'Cộng tác viên') {
          m.role = 'Thành viên chính thức';
        }
      });

      selectedMemberIds.clear();
      saveMembersToStorage(members);
      renderAll();
      updateBatchActionButtons();

      confetti({ particleCount: 100, spread: 70 });

      Swal.fire({
        icon: 'success',
        title: 'Phê duyệt hàng loạt thành công!',
        text: `Đã phê duyệt ${targetMembers.length} hồ sơ thành công vào CLB.`,
        confirmButtonColor: '#005baa'
      });
    }
  });
}

// Khởi chạy khi tài liệu sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  members = getStoredMembers();
  sanitizeStoredAvatars();
  setupNavigation();
  setupFilters();
  setupRegistrationForm();
  setupMemberFormModals();
  setupBatchActions();
  setupAuthSystem();
  setupApproveSystem();
  updateAuthUI();
  renderAll();
});

// Chuyển đổi tab điều hướng
function setupNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // Nút chuyển nhanh đến form đăng ký
  const btnGoRegister = document.getElementById('btnGoRegister');
  if (btnGoRegister) {
    btnGoRegister.addEventListener('click', () => switchTab('register'));
  }
}

function switchTab(tabId) {
  // Cập nhật tab active
  document.querySelectorAll('.nav-tab').forEach(t => {
    if (t.getAttribute('data-tab') === tabId) {
      t.classList.add('active');
    } else {
      t.classList.remove('active');
    }
  });

  // Hiển thị phần nội dung tương ứng
  document.querySelectorAll('.tab-content').forEach(content => {
    if (content.id === `tab-${tabId}`) {
      content.classList.remove('hidden');
    } else {
      content.classList.add('hidden');
    }
  });

  if (tabId === 'dashboard') {
    renderDashboardCharts();
  } else if (tabId === 'members') {
    applyFilters();
  }
}

// Render toàn bộ ứng dụng
function renderAll() {
  renderKPIs();
  renderDashboardCharts();
  applyFilters();
}

// Cập nhật thẻ chỉ số KPI
function renderKPIs() {
  const total = members.length;
  const ctvCount = members.filter(m => m.role === 'Cộng tác viên').length;
  const officialCount = members.filter(m => m.role === 'Thành viên chính thức').length;
  const bcnCount = members.filter(m => (m.role.includes('Chủ nhiệm') || m.role.includes('Trưởng ban') || m.role.includes('Phó ban')) && !m.role.includes('Cựu')).length;
  const activeCount = members.filter(m => m.status === 'Đang hoạt động').length;

  document.getElementById('kpiTotal').textContent = total;
  document.getElementById('kpiCTV').textContent = ctvCount;
  document.getElementById('kpiOfficial').textContent = officialCount;
  document.getElementById('kpiBCN').textContent = bcnCount;
  document.getElementById('kpiActive').textContent = activeCount;

  // Cập nhật số đếm ở thanh header / badge
  const headerTotal = document.getElementById('headerTotalCount');
  if (headerTotal) headerTotal.textContent = total;

  // Cập nhật huy hiệu số lượng hồ sơ đang chờ xét duyệt
  updatePendingCountBadge();
}

// Khởi tạo và vẽ biểu đồ Chart.js
function renderDashboardCharts() {
  // Thống kê theo Ban
  const deptCounts = {};
  members.forEach(m => {
    deptCounts[m.department] = (deptCounts[m.department] || 0) + 1;
  });

  const deptLabels = Object.keys(deptCounts);
  const deptData = Object.values(deptCounts);

  const ctxDept = document.getElementById('deptChart')?.getContext('2d');
  if (ctxDept) {
    if (deptChartInstance) deptChartInstance.destroy();
    deptChartInstance = new Chart(ctxDept, {
      type: 'doughnut',
      data: {
        labels: deptLabels,
        datasets: [{
          data: deptData,
          backgroundColor: [
            '#005baa',
            '#0284c7',
            '#0d9488',
            '#e11d48',
            '#d97706',
            '#7c3aed',
            '#059669',
            '#db2777',
            '#4f46e5',
            '#ea580c'
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Be Vietnam Pro', size: 12 } } }
        }
      }
    });
  }

  // Thống kê theo Vai trò (Tự động hiển thị các vai trò đang có trong CLB)
  const roleCounts = {};
  if (members.length === 0) {
    roleCounts['Chưa có nhân sự'] = 0;
  } else {
    members.forEach(m => {
      const r = m.role || 'Khác';
      roleCounts[r] = (roleCounts[r] || 0) + 1;
    });
  }

  const ctxRole = document.getElementById('roleChart')?.getContext('2d');
  if (ctxRole) {
    if (roleChartInstance) roleChartInstance.destroy();
    roleChartInstance = new Chart(ctxRole, {
      type: 'pie',
      data: {
        labels: Object.keys(roleCounts),
        datasets: [{
          data: Object.values(roleCounts),
          backgroundColor: [
            '#005baa',
            '#f59e0b',
            '#059669',
            '#7c3aed',
            '#e11d48',
            '#0284c7',
            '#64748b',
            '#ea580c',
            '#0d9488',
            '#be123c',
            '#6d28d9'
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Be Vietnam Pro', size: 12 } } }
        }
      }
    });
  }

  // Thống kê theo Giới tính
  const genderCounts = {
    'Nam': members.filter(m => m.gender === 'Nam').length,
    'Nữ': members.filter(m => m.gender === 'Nữ').length,
    'Khác': members.filter(m => m.gender !== 'Nam' && m.gender !== 'Nữ').length
  };

  const ctxGender = document.getElementById('genderChart')?.getContext('2d');
  if (ctxGender) {
    if (genderChartInstance) genderChartInstance.destroy();
    genderChartInstance = new Chart(ctxGender, {
      type: 'bar',
      data: {
        labels: Object.keys(genderCounts),
        datasets: [{
          label: 'Số lượng',
          data: Object.values(genderCounts),
          backgroundColor: ['#2563eb', '#ec4899', '#94a3b8'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'Be Vietnam Pro' } } },
          x: { ticks: { font: { family: 'Be Vietnam Pro' } } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}

// Bộ lọc và tìm kiếm
function setupFilters() {
  const searchInput = document.getElementById('searchQuery');
  const deptFilter = document.getElementById('filterDepartment');
  const majorFilter = document.getElementById('filterMajor');
  const roleFilter = document.getElementById('filterRole');
  const statusFilter = document.getElementById('filterStatus');
  const btnResetFilters = document.getElementById('btnResetFilters');

  if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; applyFilters(); });
  if (deptFilter) deptFilter.addEventListener('change', () => { currentPage = 1; applyFilters(); });
  if (majorFilter) majorFilter.addEventListener('change', () => { currentPage = 1; applyFilters(); });
  if (roleFilter) roleFilter.addEventListener('change', () => { currentPage = 1; applyFilters(); });
  if (statusFilter) statusFilter.addEventListener('change', () => { currentPage = 1; applyFilters(); });

  if (btnResetFilters) {
    btnResetFilters.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (deptFilter) deptFilter.value = 'ALL';
      if (majorFilter) majorFilter.value = 'ALL';
      if (roleFilter) roleFilter.value = 'ALL';
      if (statusFilter) statusFilter.value = 'ALL';
      currentPage = 1;
      applyFilters();
    });
  }
}

function applyFilters() {
  const query = (document.getElementById('searchQuery')?.value || '').toLowerCase().trim();
  const dept = document.getElementById('filterDepartment')?.value || 'ALL';
  const major = document.getElementById('filterMajor')?.value || 'ALL';
  const role = document.getElementById('filterRole')?.value || 'ALL';
  const status = document.getElementById('filterStatus')?.value || 'ALL';

  filteredMembers = members.filter(m => {
    const matchQuery = !query || 
      m.fullName.toLowerCase().includes(query) ||
      m.studentId.toLowerCase().includes(query) ||
      m.phone.includes(query) ||
      (m.classGroup && m.classGroup.toLowerCase().includes(query)) ||
      (m.major && m.major.toLowerCase().includes(query));

    const matchDept = (dept === 'ALL') || (m.department === dept);
    const matchMajor = (major === 'ALL') || (m.major === major);
    
    let matchRole = true;
    if (role === 'CTV') matchRole = (m.role === 'Cộng tác viên');
    else if (role === 'OFFICIAL') matchRole = (m.role === 'Thành viên chính thức');
    else if (role === 'BCN') matchRole = (m.role.includes('Chủ nhiệm') || m.role.includes('Trưởng ban') || m.role.includes('Phó ban')) && !m.role.includes('Cựu');
    else if (role !== 'ALL') matchRole = (m.role === role);
    
    const matchStatus = (status === 'ALL') || (m.status === status);

    return matchQuery && matchDept && matchMajor && matchRole && matchStatus;
  });

  const countBadge = document.getElementById('filteredCountBadge');
  if (countBadge) countBadge.textContent = `${filteredMembers.length} kết quả`;

  renderTable();
  renderPagination();
}

// Hiển thị danh sách thành viên ra bảng
function renderTable() {
  const tbody = document.getElementById('memberTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (filteredMembers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-12 text-slate-500">
          <i class="fa-solid fa-users-slash text-4xl mb-3 text-slate-300 block"></i>
          Không tìm thấy thành viên hoặc cộng tác viên nào phù hợp.
        </td>
      </tr>
    `;
    return;
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const pageItems = filteredMembers.slice(startIndex, startIndex + itemsPerPage);

  pageItems.forEach((m, idx) => {
    const tr = document.createElement('tr');
    tr.className = "border-b border-slate-100 hover:bg-sky-50/40 transition-colors duration-150";

    // Phân loại màu cho vai trò
    let roleBadgeClass = 'badge-role-tv';
    let roleIcon = 'fa-user-check';
    if (m.role === 'Cộng tác viên') {
      roleBadgeClass = 'badge-role-cbtn';
      roleIcon = 'fa-user-clock';
    } else if (m.role === 'Cố vấn') {
      roleBadgeClass = 'badge-role-covan';
      roleIcon = 'fa-chalkboard-user';
    } else if (m.role === 'Cựu Chủ nhiệm') {
      roleBadgeClass = 'badge-role-cuubcn';
      roleIcon = 'fa-crown';
    } else if (m.role === 'Cựu ban điều hành') {
      roleBadgeClass = 'badge-role-cuubdh';
      roleIcon = 'fa-user-tie';
    } else if (m.role === 'Cựu thành viên') {
      roleBadgeClass = 'badge-role-cuutv';
      roleIcon = 'fa-user-shield';
    } else if (m.role === 'Cựu Cộng tác viên') {
      roleBadgeClass = 'badge-role-cuuctv';
      roleIcon = 'fa-user-clock';
    } else if (m.role.includes('Chủ nhiệm')) {
      roleBadgeClass = 'badge-role-bcn';
      roleIcon = 'fa-crown';
    } else if (m.role.includes('Trưởng ban') || m.role.includes('Phó ban')) {
      roleBadgeClass = 'badge-role-leader';
      roleIcon = 'fa-user-shield';
    }

    // Trạng thái badge
    let statusClass = "bg-emerald-100 text-emerald-700 border border-emerald-200";
    if (m.status === 'Chờ xét duyệt') {
      statusClass = "bg-amber-100 text-amber-900 border border-amber-300 font-bold animate-pulse";
    } else if (m.status === 'Đã từ chối') {
      statusClass = "bg-rose-100 text-rose-700 border border-rose-200 font-medium";
    } else if (m.status === 'Tạm vắng') {
      statusClass = "bg-amber-100 text-amber-700 border border-amber-200";
    } else if (m.status === 'Đang đi NVQS') {
      statusClass = "bg-teal-100 text-teal-800 border border-teal-200";
    } else if (m.status === 'Đã trưởng thành CLB') {
      statusClass = "bg-purple-100 text-purple-700 border border-purple-200";
    } else if (m.status === 'Đã rời CLB') {
      statusClass = "bg-slate-100 text-slate-600 border border-slate-200";
    }

    const isChecked = selectedMemberIds.has(m.id) ? 'checked' : '';

    tr.innerHTML = `
      <td class="p-3 text-center">
        <input type="checkbox" class="row-checkbox rounded text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer" data-id="${m.id}" ${isChecked}>
      </td>
      <td class="p-3 text-xs font-semibold text-slate-400 text-center">
        ${startIndex + idx + 1}
      </td>
      <td class="p-3">
        <div class="flex items-center space-x-3">
          <div class="relative group/avatar cursor-pointer flex-shrink-0" onclick="openAvatarPreview('${m.id}')" title="Nhấp để xem ảnh to & kiểm tra hồ sơ">
            <img src="${getMemberAvatar(m)}" 
                 alt="${m.fullName}" 
                 class="w-10 h-10 rounded-full object-cover border-2 border-slate-200 group-hover/avatar:border-sky-500 shadow-sm bg-white transition-all duration-200 group-hover/avatar:scale-105"
                 onerror="this.onerror=null; this.src='assets/logo-clb-trong-dong.jpg'">
            <span class="absolute -bottom-0.5 -right-0.5 bg-sky-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover/avatar:opacity-100 transition-opacity shadow">
              <i class="fa-solid fa-magnifying-glass"></i>
            </span>
          </div>
          <div>
            <div class="font-bold text-slate-800 hover:text-sky-700 cursor-pointer text-sm" onclick="viewMemberDetail('${m.id}')">
              ${m.fullName}
            </div>
            <div class="text-xs text-slate-500 flex items-center space-x-2">
              <span class="font-mono text-sky-700 font-medium">${m.studentId || 'Chưa có MSSV'}</span>
              <span>•</span>
              <span>${m.gender}</span>
            </div>
          </div>
        </div>
      </td>
      <td class="p-3 text-xs text-slate-600">
        <div class="font-medium text-slate-800">${m.classGroup || 'N/A'}</div>
        <div class="text-slate-500 truncate max-w-[150px]">${m.major || ''}</div>
      </td>
      <td class="p-3">
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
          <i class="fa-solid fa-layer-group mr-1.5 text-blue-600 text-[10px]"></i>
          ${m.department}
        </span>
      </td>
      <td class="p-3">
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${roleBadgeClass}">
          <i class="fa-solid ${roleIcon} mr-1.5 text-[11px]"></i>
          ${m.role}
        </span>
      </td>
      <td class="p-3 text-center">
        <span class="inline-block px-2 py-0.5 rounded text-[11px] font-medium ${statusClass}">
          ${m.status}
        </span>
      </td>
      <td class="p-3 text-right whitespace-nowrap">
        <div class="flex items-center justify-end space-x-1">
          <!-- Phê duyệt: Dành cho hồ sơ Chờ xét duyệt hoặc Cộng tác viên -->
          ${(m.status === 'Chờ xét duyệt' || m.role === 'Cộng tác viên') ? (
            isAdmin() ? `
              <button onclick="openApproveModal('${m.id}')" title="Xét duyệt & Phê duyệt hồ sơ (Admin)" 
                      class="px-2 py-1 ${m.status === 'Chờ xét duyệt' ? 'bg-amber-500 hover:bg-amber-600 text-white font-bold animate-pulse' : 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold'} rounded-md transition-colors text-xs flex items-center space-x-1 shadow-sm">
                <i class="fa-solid fa-clipboard-check text-[11px]"></i>
                <span>Duyệt</span>
              </button>
            ` : `
              <button onclick="openApproveModal('${m.id}')" title="Xét duyệt hồ sơ (Yêu cầu quyền Admin - Nhấp để đăng nhập)" 
                      class="px-2 py-1 bg-slate-100 hover:bg-amber-50 text-slate-400 hover:text-amber-700 rounded-md transition-colors text-xs font-medium border border-slate-200 flex items-center space-x-1">
                <i class="fa-solid fa-lock text-[10px]"></i>
                <span>Duyệt</span>
              </button>
            `
          ) : ''}

          <!-- Xem thẻ / chi tiết (Tất cả người dùng đều xem được) -->
          <button onclick="viewMemberDetail('${m.id}')" title="Xem hồ sơ & in thẻ" 
                  class="p-1.5 text-sky-600 hover:bg-sky-50 rounded-md transition-colors">
            <i class="fa-solid fa-id-card"></i>
          </button>
          
          <!-- Sửa thông tin: Admin được sửa; Tài khoản thường nhấp vào sẽ nhắc đăng nhập Admin -->
          ${isAdmin() ? `
            <button onclick="openEditMemberModal('${m.id}')" title="Chỉnh sửa thông tin hồ sơ (Admin)" 
                    class="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition-colors">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
          ` : `
            <button onclick="openEditMemberModal('${m.id}')" title="Chỉnh sửa (Chỉ Admin mới được sửa - Nhấp để đăng nhập)" 
                    class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors">
              <i class="fa-solid fa-pen-to-square opacity-60"></i>
            </button>
          `}

          <!-- Xóa hồ sơ: Admin được xóa; Tài khoản thường nhấp vào sẽ nhắc đăng nhập Admin -->
          ${isAdmin() ? `
            <button onclick="deleteMember('${m.id}')" title="Xóa hồ sơ khỏi hệ thống (Admin)" 
                    class="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-colors">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          ` : `
            <button onclick="deleteMember('${m.id}')" title="Xóa hồ sơ (Chỉ Admin mới được xóa - Nhấp để đăng nhập)" 
                    class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors">
              <i class="fa-solid fa-trash-can opacity-60"></i>
            </button>
          `}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Gắn sự kiện chọn từng dòng
  document.querySelectorAll('.row-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = e.target.getAttribute('data-id');
      if (e.target.checked) {
        selectedMemberIds.add(id);
      } else {
        selectedMemberIds.delete(id);
      }
      updateBatchActionButtons();
    });
  });

  updateSelectAllCheckbox();
}

// Phân trang
function renderPagination() {
  const paginationContainer = document.getElementById('paginationControls');
  if (!paginationContainer) return;

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage) || 1;
  const startItem = filteredMembers.length ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, filteredMembers.length);

  let html = `
    <div class="text-xs text-slate-500">
      Hiển thị <span class="font-semibold text-slate-700">${startItem}</span> - <span class="font-semibold text-slate-700">${endItem}</span> trên tổng số <span class="font-semibold text-slate-700">${filteredMembers.length}</span> người
    </div>
    <div class="flex items-center space-x-1">
      <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} 
              class="px-2.5 py-1 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
        <i class="fa-solid fa-chevron-left mr-1"></i>Trước
      </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      html += `
        <button onclick="changePage(${i})" 
                class="px-3 py-1 text-xs rounded border ${i === currentPage ? 'bg-sky-600 border-sky-600 text-white font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}">
          ${i}
        </button>
      `;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += `<span class="px-1 text-slate-400 text-xs">...</span>`;
    }
  }

  html += `
      <button onclick="changePage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''} 
              class="px-2.5 py-1 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
        Sau<i class="fa-solid fa-chevron-right ml-1"></i>
      </button>
    </div>
  `;

  paginationContainer.innerHTML = html;
}

function changePage(page) {
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderTable();
  renderPagination();
}

// Xử lý chọn hàng loạt
function setupBatchActions() {
  const selectAll = document.getElementById('selectAllRows');
  if (selectAll) {
    selectAll.addEventListener('change', (e) => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const pageItems = filteredMembers.slice(startIndex, startIndex + itemsPerPage);
      
      if (e.target.checked) {
        pageItems.forEach(m => selectedMemberIds.add(m.id));
      } else {
        pageItems.forEach(m => selectedMemberIds.delete(m.id));
      }
      renderTable();
      updateBatchActionButtons();
    });
  }

  const btnDeleteSelected = document.getElementById('btnDeleteSelected');
  if (btnDeleteSelected) {
    btnDeleteSelected.addEventListener('click', deleteSelectedMembers);
  }

  const btnExportSelected = document.getElementById('btnExportSelected');
  if (btnExportSelected) {
    btnExportSelected.addEventListener('click', exportSelectedToExcel);
  }
}

function updateSelectAllCheckbox() {
  const selectAll = document.getElementById('selectAllRows');
  if (!selectAll) return;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const pageItems = filteredMembers.slice(startIndex, startIndex + itemsPerPage);
  
  if (pageItems.length === 0) {
    selectAll.checked = false;
    selectAll.indeterminate = false;
    return;
  }

  const selectedCount = pageItems.filter(m => selectedMemberIds.has(m.id)).length;
  selectAll.checked = selectedCount === pageItems.length;
  selectAll.indeterminate = selectedCount > 0 && selectedCount < pageItems.length;
}

function updateBatchActionButtons() {
  const batchBar = document.getElementById('batchActionsBar');
  const countSpan = document.getElementById('selectedCountText');
  if (batchBar && countSpan) {
    if (selectedMemberIds.size > 0) {
      batchBar.classList.remove('hidden');
      countSpan.textContent = `Đã chọn ${selectedMemberIds.size} mục`;
    } else {
      batchBar.classList.add('hidden');
    }
  }
}

// Nhanh chóng duyệt CTV lên Thành viên chính thức (Admin only)
function quickPromoteMember(id) {
  if (!isAdmin()) {
    promptAdminLogin('xét duyệt CTV lên Thành viên chính thức');
    return;
  }

  const target = members.find(m => m.id === id);
  if (!target) return;

  Swal.fire({
    title: 'Xét duyệt chính thức?',
    text: `Bạn có muốn nâng cấp đồng chí "${target.fullName}" từ Cộng tác viên lên Thành viên chính thức của CLB không?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#005baa',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Đồng ý nâng cấp',
    cancelButtonText: 'Hủy'
  }).then((result) => {
    if (result.isConfirmed) {
      target.role = 'Thành viên chính thức';
      saveMembersToStorage(members);
      renderAll();
      Swal.fire('Thành công!', `Đã chuyển "${target.fullName}" thành Thành viên chính thức.`, 'success');
    }
  });
}

// Xóa thành viên (Admin only)
function deleteMember(id) {
  if (!isAdmin()) {
    promptAdminLogin('xóa thành viên khỏi hệ thống');
    return;
  }

  const target = members.find(m => m.id === id);
  if (!target) return;

  Swal.fire({
    title: 'Xác nhận xóa hồ sơ?',
    html: `Bạn có chắc chắn muốn xóa thông tin của đồng chí <b>${target.fullName}</b> (${target.studentId || target.id}) không?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Đồng ý xóa',
    cancelButtonText: 'Hủy'
  }).then((result) => {
    if (result.isConfirmed) {
      members = members.filter(m => m.id !== id);
      selectedMemberIds.delete(id);
      saveMembersToStorage(members);
      renderAll();
      updateBatchActionButtons();
      Swal.fire('Đã xóa!', 'Hồ sơ đã được xóa khỏi hệ thống.', 'success');
    }
  });
}

// Xóa các mục đã chọn (Admin only)
function deleteSelectedMembers() {
  if (!isAdmin()) {
    promptAdminLogin('xóa các thành viên đã chọn');
    return;
  }

  if (selectedMemberIds.size === 0) return;

  Swal.fire({
    title: `Xóa ${selectedMemberIds.size} hồ sơ đã chọn?`,
    text: 'Hành động này sẽ không thể khôi phục lại dữ liệu!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Xóa tất cả',
    cancelButtonText: 'Hủy'
  }).then((result) => {
    if (result.isConfirmed) {
      members = members.filter(m => !selectedMemberIds.has(m.id));
      selectedMemberIds.clear();
      saveMembersToStorage(members);
      renderAll();
      updateBatchActionButtons();
      Swal.fire('Đã xóa thành công!', 'Các hồ sơ được chọn đã được xóa.', 'success');
    }
  });
}

// Cổng Đăng Ký / Thu Thập Thông Tin Công Khai
function setupRegistrationForm() {
  const form = document.getElementById('publicRegistrationForm');
  if (!form) return;

  const regAvatar = document.getElementById('regAvatar');
  const regAvatarFile = document.getElementById('regAvatarFile');
  const regAvatarPreview = document.getElementById('regAvatarPreview');
  const btnResetRegAvatar = document.getElementById('btnResetRegAvatar');

  // Xem trước ngay khi dán link
  if (regAvatar && regAvatarPreview) {
    regAvatar.addEventListener('input', () => {
      const val = regAvatar.value.trim();
      if (val) {
        const norm = normalizeAvatarUrl(val);
        regAvatarPreview.src = norm || DEFAULT_AVATAR;
      } else {
        regAvatarPreview.src = DEFAULT_AVATAR;
      }
    });
  }

  // Tải file ảnh từ máy / điện thoại
  if (regAvatarFile) {
    regAvatarFile.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleAvatarFileUpload(e.target.files[0], 'regAvatar', 'regAvatarPreview');
      }
    });
  }

  // Đặt lại ảnh mặc định
  if (btnResetRegAvatar) {
    btnResetRegAvatar.addEventListener('click', () => {
      if (regAvatar) regAvatar.value = '';
      if (regAvatarFile) regAvatarFile.value = '';
      if (regAvatarPreview) regAvatarPreview.src = DEFAULT_AVATAR;
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const fullName = document.getElementById('regFullName').value.trim();
    const studentId = document.getElementById('regStudentId').value.trim().toUpperCase();
    const phone = document.getElementById('regPhone').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const gender = document.querySelector('input[name="regGender"]:checked')?.value || 'Nam';
    const birthDate = document.getElementById('regBirthDate').value;
    const classGroup = document.getElementById('regClassGroup').value.trim();
    const major = document.getElementById('regMajor').value.trim();
    const trainingLevel = document.getElementById('regTrainingLevel').value;
    const homeTown = document.getElementById('regHomeTown').value.trim();
    const department = document.getElementById('regDepartment').value;
    const role = document.getElementById('regRole').value;
    const facebook = document.getElementById('regFacebook').value.trim();
    const notes = document.getElementById('regNotes').value.trim();
    const rawAvatar = regAvatar ? regAvatar.value.trim() : '';
    const avatar = normalizeAvatarUrl(rawAvatar) || DEFAULT_AVATAR;

    // Thu thập kỹ năng được tích chọn
    const selectedSkills = [];
    document.querySelectorAll('.reg-skill-check:checked').forEach(cb => {
      selectedSkills.push(cb.value);
    });
    const customSkill = document.getElementById('regCustomSkill').value.trim();
    if (customSkill) selectedSkills.push(customSkill);

    // Kiểm tra trùng MSSV nếu có
    if (studentId && members.some(m => m.studentId.toUpperCase() === studentId)) {
      Swal.fire({
        icon: 'error',
        title: 'MSSV đã tồn tại!',
        text: `Mã số sinh viên ${studentId} đã có trong danh sách CLB. Vui lòng kiểm tra lại!`
      });
      return;
    }

    // Tạo mã thành viên tự động
    const currentYear = new Date().getFullYear();
    const countSeq = (members.length + 1).toString().padStart(3, '0');
    const newId = `TD-${currentYear}-${countSeq}`;

    const newMember = {
      id: newId,
      fullName,
      studentId,
      gender,
      birthDate,
      phone,
      email,
      facebook,
      classGroup,
      major,
      trainingLevel,
      homeTown,
      department,
      role: role || 'Cộng tác viên',
      skills: selectedSkills,
      status: "Chờ xét duyệt",
      joinDate: new Date().toISOString().split('T')[0],
      avatar: avatar,
      notes
    };

    members.unshift(newMember);
    saveMembersToStorage(members);
    renderAll();

    // Hiệu ứng pháo hoa chúc mừng
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Reset form & ảnh xem trước
    form.reset();
    if (regAvatarPreview) regAvatarPreview.src = DEFAULT_AVATAR;
    if (document.getElementById('regMajor')) document.getElementById('regMajor').value = '';

    // Mở popup thông báo thành công kèm trạng thái chờ duyệt
    Swal.fire({
      icon: 'success',
      title: 'Đăng Ký Thành Công!',
      html: `
        <div class="text-left text-sm space-y-2 mt-2 text-slate-700">
          <p>Chào mừng đồng chí <b>${fullName}</b> đã gửi hồ sơ gia nhập <b>CLB TNTN Trống Đồng</b>.</p>
          <div class="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
            <i class="fa-solid fa-clock-rotate-left mr-1.5 text-amber-600 font-bold"></i>
            Trạng thái hiện tại: <b>Chờ xét duyệt</b>.<br>
            Hồ sơ sẽ được <b>Quản trị viên (Admin Ban Chủ nhiệm)</b> xem xét và phê duyệt trong thời gian sớm nhất.
          </div>
          <p class="text-xs text-slate-500">Mã hồ sơ: <span class="font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">${newId}</span></p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Xem Hồ Sơ Đã Nộp',
      cancelButtonText: 'Đóng',
      confirmButtonColor: '#005baa'
    }).then((res) => {
      if (res.isConfirmed) {
        viewMemberDetail(newId);
      }
    });
  });
}

// Xem chi tiết thành viên & Tạo mã QR thẻ
function viewMemberDetail(id) {
  const member = members.find(m => m.id === id);
  if (!member) return;

  const modal = document.getElementById('viewMemberModal');
  if (!modal) return;

  // Điền dữ liệu vào Thẻ hiển thị
  document.getElementById('cardViewId').textContent = member.id;
  document.getElementById('cardViewName').textContent = member.fullName;
  document.getElementById('cardViewStudentId').textContent = member.studentId || 'N/A';
  document.getElementById('cardViewClass').textContent = member.classGroup || 'Chưa cập nhật';
  document.getElementById('cardViewDept').textContent = member.department;
  document.getElementById('cardViewRole').textContent = member.role;
  const cardAvatar = document.getElementById('cardViewAvatar');
  if (cardAvatar) {
    cardAvatar.src = getMemberAvatar(member);
    cardAvatar.onerror = function() {
      this.onerror = null;
      this.src = DEFAULT_AVATAR;
    };
  }

  // Thông tin chi tiết bên cạnh
  document.getElementById('detailViewPhone').textContent = member.phone || 'Chưa có';
  document.getElementById('detailViewEmail').textContent = member.email || 'Chưa có';
  document.getElementById('detailViewBirth').textContent = member.birthDate ? formatDate(member.birthDate) : 'Chưa có';
  document.getElementById('detailViewGender').textContent = member.gender || 'N/A';
  document.getElementById('detailViewMajor').textContent = member.major || 'Chưa cập nhật';
  document.getElementById('detailViewTraining').textContent = member.trainingLevel || 'Cao đẳng';
  document.getElementById('detailViewHomeTown').textContent = member.homeTown || 'Đức Hòa, Long An';
  document.getElementById('detailViewStatus').textContent = member.status;
  document.getElementById('detailViewNotes').textContent = member.notes || 'Không có ghi chú thêm.';

  const fbLink = document.getElementById('detailViewFacebook');
  if (fbLink) {
    if (member.facebook) {
      fbLink.href = member.facebook;
      fbLink.textContent = member.facebook;
      fbLink.classList.remove('pointer-events-none', 'text-slate-400');
    } else {
      fbLink.href = '#';
      fbLink.textContent = 'Chưa cập nhật link';
      fbLink.classList.add('pointer-events-none', 'text-slate-400');
    }
  }

  // Danh sách kỹ năng
  const skillsContainer = document.getElementById('detailViewSkills');
  if (skillsContainer) {
    skillsContainer.innerHTML = '';
    if (member.skills && member.skills.length > 0) {
      member.skills.forEach(s => {
        const span = document.createElement('span');
        span.className = "inline-block bg-sky-100 text-sky-800 text-xs px-2.5 py-1 rounded-full font-medium mr-1.5 mb-1.5 border border-sky-200";
        span.textContent = s;
        skillsContainer.appendChild(span);
      });
    } else {
      skillsContainer.innerHTML = '<span class="text-xs text-slate-400 italic">Chưa liệt kê kỹ năng</span>';
    }
  }

  // Tạo mã QR Code cho thành viên
  const qrContainer = document.getElementById('cardViewQRCode');
  if (qrContainer) {
    qrContainer.innerHTML = '';
    new QRCode(qrContainer, {
      text: `CLB TNTN TRỐNG ĐỒNG - CĐ LONG AN CS ĐỨC HÒA\nMã TV: ${member.id}\nHọ tên: ${member.fullName}\nMSSV: ${member.studentId}\nChức vụ: ${member.role} - ${member.department}\nSĐT: ${member.phone}`,
      width: 78,
      height: 78,
      colorDark: "#003b73",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  }

  // Lưu ID hiện tại cho nút in thẻ
  modal.setAttribute('data-current-id', member.id);
  modal.classList.remove('hidden');
}

function closeViewMemberModal() {
  const modal = document.getElementById('viewMemberModal');
  if (modal) modal.classList.add('hidden');
}

// ==========================================
// TÍNH NĂNG XEM ẢNH ĐẠI DIỆN TO RÕ & KIỂM TRA HỒ SƠ
// ==========================================
let currentAvatarZoom = 1;
let currentAvatarRotate = 0;
let currentPreviewMemberId = null;

function openAvatarPreview(idOrMember) {
  let member = null;
  if (typeof idOrMember === 'string') {
    member = members.find(m => m.id === idOrMember);
    currentPreviewMemberId = idOrMember;
  } else if (typeof idOrMember === 'object' && idOrMember !== null) {
    member = idOrMember;
    currentPreviewMemberId = member.id || null;
  }

  if (!member) {
    Swal.fire('Thông báo', 'Không tìm thấy thông tin thành viên cần xem ảnh!', 'warning');
    return;
  }

  const modal = document.getElementById('avatarPreviewModal');
  if (!modal) return;

  // Lấy avatar an toàn
  const avatarUrl = getMemberAvatar(member);
  const largeImg = document.getElementById('avatarPreviewLargeImg');
  if (largeImg) {
    largeImg.src = avatarUrl;
    largeImg.onerror = function() {
      this.onerror = null;
      this.src = DEFAULT_AVATAR;
    };
  }

  // Cập nhật link ngoài và link tải ảnh
  const extLink = document.getElementById('avatarPreviewExternalLink');
  if (extLink) extLink.href = avatarUrl;

  // Nguồn ảnh tag & Kích thước ảnh
  const sourceTag = document.getElementById('avatarPreviewSourceTag');
  if (sourceTag) {
    if (avatarUrl === DEFAULT_AVATAR) {
      sourceTag.textContent = 'Logo CLB mặc định';
    } else if (avatarUrl.startsWith('data:image')) {
      sourceTag.textContent = 'Ảnh tải từ thiết bị (Base64)';
    } else {
      sourceTag.textContent = 'Ảnh từ liên kết trực tuyến';
    }
  }

  // Cập nhật thông số kích thước khi ảnh tải xong
  const dimTag = document.getElementById('avatarPreviewDimensions');
  if (dimTag && largeImg) {
    dimTag.textContent = 'Đang tải...';
    const tempImg = new Image();
    tempImg.onload = function() {
      dimTag.textContent = `${this.naturalWidth} x ${this.naturalHeight} px`;
    };
    tempImg.onerror = function() {
      dimTag.textContent = 'HD Portrait';
    };
    tempImg.src = avatarUrl;
  }

  // Reset zoom & xoay
  resetAvatarTransform();

  // Đổ thông tin chi tiết to rõ
  const nameEl = document.getElementById('avatarPreviewFullName');
  if (nameEl) nameEl.textContent = member.fullName || 'Chưa có họ tên';
  
  const roleBadge = document.getElementById('avatarPreviewRoleBadge');
  if (roleBadge) {
    roleBadge.textContent = member.role || 'Thành viên';
    let roleClass = 'badge-role-tv';
    if (member.role === 'Cộng tác viên') roleClass = 'badge-role-cbtn';
    else if (member.role && member.role.includes('Chủ nhiệm')) roleClass = 'badge-role-bcn';
    else if (member.role && (member.role.includes('Trưởng ban') || member.role.includes('Phó ban'))) roleClass = 'badge-role-leader';
    roleBadge.className = `text-xs font-bold px-3 py-1 rounded-full ${roleClass}`;
  }

  const deptBadge = document.getElementById('avatarPreviewDeptBadge');
  if (deptBadge) deptBadge.textContent = member.department || 'CLB TNTN Trống Đồng';

  const statusBadge = document.getElementById('avatarPreviewStatusBadge');
  if (statusBadge) {
    statusBadge.textContent = member.status || 'Đang hoạt động';
    if (member.status === 'Chờ xét duyệt') {
      statusBadge.className = 'text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/40 animate-pulse';
    } else if (member.status === 'Đã từ chối') {
      statusBadge.className = 'text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-400/40';
    } else {
      statusBadge.className = 'text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30';
    }
  }

  const studentIdEl = document.getElementById('avatarPreviewStudentId');
  if (studentIdEl) studentIdEl.textContent = member.studentId || 'Chưa có MSSV';

  const memberIdEl = document.getElementById('avatarPreviewMemberId');
  if (memberIdEl) memberIdEl.textContent = member.id || 'N/A';

  const classEl = document.getElementById('avatarPreviewClass');
  if (classEl) classEl.textContent = member.classGroup || 'Chưa cập nhật';

  const majorEl = document.getElementById('avatarPreviewMajor');
  if (majorEl) majorEl.textContent = member.major || 'Chưa cập nhật';
  
  const phoneElem = document.getElementById('avatarPreviewPhone');
  if (phoneElem) {
    phoneElem.href = member.phone ? `tel:${member.phone}` : 'javascript:void(0)';
    const phoneSpan = phoneElem.querySelector('span');
    if (phoneSpan) phoneSpan.textContent = member.phone || 'Chưa có';
  }

  const emailElem = document.getElementById('avatarPreviewEmail');
  if (emailElem) {
    emailElem.href = member.email ? `mailto:${member.email}` : 'javascript:void(0)';
    emailElem.textContent = member.email || 'Chưa có';
  }

  const birthEl = document.getElementById('avatarPreviewBirth');
  if (birthEl) birthEl.textContent = member.birthDate ? formatDate(member.birthDate) : 'Chưa cập nhật';

  const genderEl = document.getElementById('avatarPreviewGender');
  if (genderEl) genderEl.textContent = member.gender || 'N/A';

  const homeTownEl = document.getElementById('avatarPreviewHomeTown');
  if (homeTownEl) homeTownEl.textContent = member.homeTown || 'Đức Hòa, Long An';

  // Nút xét duyệt nhanh nếu đang là Chờ xét duyệt
  const btnApprove = document.getElementById('btnPreviewApproveCandidate');
  if (btnApprove) {
    if (member.status === 'Chờ xét duyệt') {
      btnApprove.classList.remove('hidden');
    } else {
      btnApprove.classList.add('hidden');
    }
  }

  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
}

function closeAvatarPreviewModal() {
  const modal = document.getElementById('avatarPreviewModal');
  if (modal) modal.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
  resetAvatarTransform();
}

function handleAvatarPreviewBackdrop(e) {
  if (e.target && e.target.id === 'avatarPreviewModal') {
    closeAvatarPreviewModal();
  }
}

function zoomAvatar(delta) {
  currentAvatarZoom = Math.max(0.6, Math.min(3.0, currentAvatarZoom + delta));
  applyAvatarTransform();
}

function rotateAvatar() {
  currentAvatarRotate = (currentAvatarRotate + 90) % 360;
  applyAvatarTransform();
}

function resetAvatarTransform() {
  currentAvatarZoom = 1;
  currentAvatarRotate = 0;
  applyAvatarTransform();
}

function applyAvatarTransform() {
  const img = document.getElementById('avatarPreviewLargeImg');
  const levelDisplay = document.getElementById('avatarZoomLevel');
  if (img) {
    img.style.transform = `scale(${currentAvatarZoom}) rotate(${currentAvatarRotate}deg)`;
  }
  if (levelDisplay) {
    levelDisplay.textContent = `${Math.round(currentAvatarZoom * 100)}%`;
  }
}

function downloadCurrentAvatar() {
  const img = document.getElementById('avatarPreviewLargeImg');
  if (!img || !img.src) return;
  
  const link = document.createElement('a');
  link.href = img.src;
  const memberName = document.getElementById('avatarPreviewFullName')?.textContent?.trim() || 'thanh_vien';
  const safeName = memberName.replace(/\s+/g, '_');
  link.download = `Avatar_${safeName}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function copyAvatarPreviewStudentId() {
  const mssv = document.getElementById('avatarPreviewStudentId')?.textContent?.trim();
  if (mssv && mssv !== 'Chưa có MSSV') {
    navigator.clipboard.writeText(mssv).then(() => {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Đã sao chép MSSV: ${mssv}`,
        showConfirmButton: false,
        timer: 1800
      });
    });
  }
}

function openAvatarPreviewFromCard() {
  const modal = document.getElementById('viewMemberModal');
  const currentId = modal ? modal.getAttribute('data-current-id') : null;
  if (currentId) {
    openAvatarPreview(currentId);
  }
}

function openAvatarPreviewFromApprove() {
  const currentId = document.getElementById('approveMemberId')?.value;
  if (currentId) {
    openAvatarPreview(currentId);
  }
}

function openAvatarPreviewFromReg() {
  const img = document.getElementById('regAvatarPreview');
  const previewData = {
    id: 'TD-DANGKY',
    fullName: document.getElementById('regFullName')?.value?.trim() || 'Ứng viên đăng ký mới',
    studentId: document.getElementById('regStudentId')?.value?.trim() || 'Chưa nhập MSSV',
    classGroup: document.getElementById('regClass')?.value?.trim() || 'Chưa nhập',
    major: document.getElementById('regMajor')?.value?.trim() || 'Chưa chọn',
    department: document.getElementById('regDepartment')?.value?.trim() || 'Ban Nhân sự',
    role: 'Cộng tác viên (Đăng ký mới)',
    status: 'Chờ xét duyệt',
    phone: document.getElementById('regPhone')?.value?.trim() || '',
    email: document.getElementById('regEmail')?.value?.trim() || '',
    birthDate: document.getElementById('regBirthDate')?.value || '',
    gender: document.getElementById('regGender')?.value || 'Nam',
    homeTown: document.getElementById('regHomeTown')?.value?.trim() || 'Đức Hòa, Long An',
    avatar: img ? img.src : DEFAULT_AVATAR
  };
  openAvatarPreview(previewData);
}

function openAvatarPreviewFromEdit() {
  const img = document.getElementById('modalAvatarPreview');
  const previewData = {
    id: document.getElementById('editMemberId')?.value || 'TD-EDIT',
    fullName: document.getElementById('modalFullName')?.value?.trim() || 'Thành viên chỉnh sửa',
    studentId: document.getElementById('modalStudentId')?.value?.trim() || 'Chưa nhập MSSV',
    classGroup: document.getElementById('modalClass')?.value?.trim() || 'Chưa nhập',
    major: document.getElementById('modalMajor')?.value?.trim() || 'Chưa chọn',
    department: document.getElementById('modalDept')?.value?.trim() || 'Ban chuyên môn',
    role: document.getElementById('modalRole')?.value?.trim() || 'Thành viên',
    status: document.getElementById('modalStatus')?.value?.trim() || 'Đang hoạt động',
    phone: document.getElementById('modalPhone')?.value?.trim() || '',
    email: document.getElementById('modalEmail')?.value?.trim() || '',
    birthDate: document.getElementById('modalBirthDate')?.value || '',
    gender: document.getElementById('modalGender')?.value || 'Nam',
    homeTown: document.getElementById('modalHomeTown')?.value?.trim() || 'Đức Hòa, Long An',
    avatar: img ? img.src : DEFAULT_AVATAR
  };
  openAvatarPreview(previewData);
}

function openProfileFromAvatarPreview() {
  if (currentPreviewMemberId) {
    closeAvatarPreviewModal();
    viewMemberDetail(currentPreviewMemberId);
  }
}

function openApproveFromAvatarPreview() {
  if (currentPreviewMemberId) {
    closeAvatarPreviewModal();
    openApproveModal(currentPreviewMemberId);
  }
}


// In Thẻ Thành Viên
function printCurrentMemberCard() {
  window.print();
}

// Modal Thêm Mới & Chỉnh Sửa Thành Viên (Admin)
function setupMemberFormModals() {
  const btnOpenAddModal = document.getElementById('btnOpenAddMemberModal');
  if (btnOpenAddModal) {
    btnOpenAddModal.addEventListener('click', () => {
      openAddMemberModal();
    });
  }

  const editForm = document.getElementById('editMemberForm');
  if (editForm) {
    editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveEditedMember();
    });
  }

  const modalAvatar = document.getElementById('modalAvatar');
  const modalAvatarFile = document.getElementById('modalAvatarFile');
  const modalAvatarPreview = document.getElementById('modalAvatarPreview');
  const btnResetModalAvatar = document.getElementById('btnResetModalAvatar');

  if (modalAvatar && modalAvatarPreview) {
    modalAvatar.addEventListener('input', () => {
      const val = modalAvatar.value.trim();
      if (val) {
        const norm = normalizeAvatarUrl(val);
        modalAvatarPreview.src = norm || DEFAULT_AVATAR;
      } else {
        modalAvatarPreview.src = DEFAULT_AVATAR;
      }
    });
  }

  if (modalAvatarFile) {
    modalAvatarFile.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleAvatarFileUpload(e.target.files[0], 'modalAvatar', 'modalAvatarPreview');
      }
    });
  }

  if (btnResetModalAvatar) {
    btnResetModalAvatar.addEventListener('click', () => {
      if (modalAvatar) modalAvatar.value = '';
      if (modalAvatarFile) modalAvatarFile.value = '';
      if (modalAvatarPreview) modalAvatarPreview.src = DEFAULT_AVATAR;
    });
  }
}

function openAddMemberModal() {
  const modal = document.getElementById('editMemberModal');
  const title = document.getElementById('editModalTitle');
  const form = document.getElementById('editMemberForm');

  if (!modal || !form) return;

  form.reset();
  document.getElementById('editMemberId').value = '';
  title.innerHTML = '<i class="fa-solid fa-user-plus mr-2 text-sky-600"></i>Thêm Mới Thành Viên / CTV';

  // Mặc định ngày gia nhập hôm nay
  document.getElementById('modalJoinDate').value = new Date().toISOString().split('T')[0];
  const preview = document.getElementById('modalAvatarPreview');
  if (preview) preview.src = DEFAULT_AVATAR;
  const majorSelect = document.getElementById('modalMajor');
  if (majorSelect) majorSelect.value = '';

  modal.classList.remove('hidden');
}

function openEditMemberModal(id) {
  if (!isAdmin()) {
    promptAdminLogin('chỉnh sửa hồ sơ thành viên');
    return;
  }

  const member = members.find(m => m.id === id);
  if (!member) return;

  const modal = document.getElementById('editMemberModal');
  const title = document.getElementById('editModalTitle');
  if (!modal) return;

  title.innerHTML = `<i class="fa-solid fa-user-pen mr-2 text-amber-600"></i>Chỉnh Sửa Hồ Sơ: ${member.fullName}`;

  document.getElementById('editMemberId').value = member.id;
  document.getElementById('modalFullName').value = member.fullName || '';
  document.getElementById('modalStudentId').value = member.studentId || '';
  document.getElementById('modalGender').value = member.gender || 'Nam';
  document.getElementById('modalBirthDate').value = member.birthDate || '';
  document.getElementById('modalPhone').value = member.phone || '';
  document.getElementById('modalEmail').value = member.email || '';
  document.getElementById('modalFacebook').value = member.facebook || '';
  document.getElementById('modalClassGroup').value = member.classGroup || '';
  
  // Xử lý chọn Chuyên ngành (tự bổ sung option nếu thành viên có chuyên ngành cũ)
  const majorSelect = document.getElementById('modalMajor');
  if (majorSelect) {
    majorSelect.value = member.major || '';
    if (member.major && !Array.from(majorSelect.options).some(o => o.value === member.major)) {
      const opt = document.createElement('option');
      opt.value = member.major;
      opt.textContent = member.major;
      majorSelect.appendChild(opt);
      majorSelect.value = member.major;
    }
  }

  document.getElementById('modalTrainingLevel').value = member.trainingLevel || 'Cao đẳng';
  document.getElementById('modalHomeTown').value = member.homeTown || '';
  document.getElementById('modalDepartment').value = member.department || 'Ban Hậu cần';
  document.getElementById('modalRole').value = member.role || 'Cộng tác viên';
  document.getElementById('modalStatus').value = member.status || 'Đang hoạt động';
  document.getElementById('modalJoinDate').value = member.joinDate || '';
  document.getElementById('modalSkills').value = member.skills ? member.skills.join(', ') : '';
  document.getElementById('modalNotes').value = member.notes || '';
  
  // Ảnh đại diện & xem trước
  const modalAvatar = document.getElementById('modalAvatar');
  const modalPreview = document.getElementById('modalAvatarPreview');
  if (modalAvatar) modalAvatar.value = member.avatar || '';
  if (modalPreview) modalPreview.src = getMemberAvatar(member);

  modal.classList.remove('hidden');
}

function closeEditMemberModal() {
  const modal = document.getElementById('editMemberModal');
  if (modal) modal.classList.add('hidden');
}

function saveEditedMember() {
  const id = document.getElementById('editMemberId').value;
  const fullName = document.getElementById('modalFullName').value.trim();
  const studentId = document.getElementById('modalStudentId').value.trim().toUpperCase();
  const gender = document.getElementById('modalGender').value;
  const birthDate = document.getElementById('modalBirthDate').value;
  const phone = document.getElementById('modalPhone').value.trim();
  const email = document.getElementById('modalEmail').value.trim();
  const facebook = document.getElementById('modalFacebook').value.trim();
  const classGroup = document.getElementById('modalClassGroup').value.trim();
  const major = document.getElementById('modalMajor').value.trim();
  const trainingLevel = document.getElementById('modalTrainingLevel').value;
  const homeTown = document.getElementById('modalHomeTown').value.trim();
  const department = document.getElementById('modalDepartment').value;
  const role = document.getElementById('modalRole').value;
  const status = document.getElementById('modalStatus').value;
  const joinDate = document.getElementById('modalJoinDate').value;
  const rawAvatar = document.getElementById('modalAvatar').value.trim();
  const avatar = normalizeAvatarUrl(rawAvatar);
  const notes = document.getElementById('modalNotes').value.trim();
  
  const rawSkills = document.getElementById('modalSkills').value;
  const skills = rawSkills ? rawSkills.split(',').map(s => s.trim()).filter(Boolean) : [];

  if (id) {
    // Chỉ Admin mới được chỉnh sửa thông tin thành viên hiện có
    if (!isAdmin()) {
      promptAdminLogin('chỉnh sửa thông tin thành viên');
      return;
    }

    // Cập nhật thành viên có sẵn
    const index = members.findIndex(m => m.id === id);
    if (index !== -1) {
      members[index] = {
        ...members[index],
        fullName,
        studentId,
        gender,
        birthDate,
        phone,
        email,
        facebook,
        classGroup,
        major,
        trainingLevel,
        homeTown,
        department,
        role,
        status,
        joinDate,
        skills,
        notes,
        avatar: avatar || members[index].avatar || DEFAULT_AVATAR
      };
      Swal.fire('Thành công', 'Đã cập nhật thông tin thành viên!', 'success');
    }
  } else {
    // Thêm mới thành viên
    const currentYear = new Date().getFullYear();
    const countSeq = (members.length + 1).toString().padStart(3, '0');
    const newId = `TD-${currentYear}-${countSeq}`;

    const newMember = {
      id: newId,
      fullName,
      studentId,
      gender,
      birthDate,
      phone,
      email,
      facebook,
      classGroup,
      major,
      trainingLevel,
      homeTown,
      department,
      role: isAdmin() ? role : 'Cộng tác viên',
      status: isAdmin() ? (status || 'Đang hoạt động') : 'Chờ xét duyệt',
      joinDate: joinDate || new Date().toISOString().split('T')[0],
      skills,
      notes,
      avatar: avatar || DEFAULT_AVATAR
    };
    members.unshift(newMember);

    if (isAdmin()) {
      Swal.fire('Thành công', 'Đã thêm thành viên mới vào CLB!', 'success');
    } else {
      Swal.fire({
        icon: 'success',
        title: 'Đã gửi thông tin!',
        text: 'Hồ sơ đã được lưu vào hệ thống và đang ở trạng thái "Chờ xét duyệt" bởi Quản trị viên (Admin).'
      });
    }
  }

  saveMembersToStorage(members);
  closeEditMemberModal();
  renderAll();
}

// XUẤT EXCEL (.xlsx) CHUẨN ĐOÀN BỘ PHẬN
function exportMembersToExcel() {
  exportDataToExcelFile(members, 'DANH_SACH_CLB_TNTN_TRONG_DONG_TOAN_BO.xlsx');
}

function exportSelectedToExcel() {
  if (selectedMemberIds.size === 0) {
    Swal.fire('Chú ý', 'Vui lòng chọn ít nhất một thành viên để xuất!', 'info');
    return;
  }
  const selectedList = members.filter(m => selectedMemberIds.has(m.id));
  exportDataToExcelFile(selectedList, 'DANH_SACH_CLB_TRONG_DONG_DA_CHON.xlsx');
}

function exportDataToExcelFile(dataList, fileName) {
  // Chuẩn bị dữ liệu định dạng chuẩn báo cáo
  const excelData = dataList.map((m, index) => ({
    "STT": index + 1,
    "Mã Thành Viên": m.id,
    "Họ và Tên": m.fullName,
    "MSSV": m.studentId || '',
    "Giới Tính": m.gender || '',
    "Ngày Sinh": m.birthDate ? formatDate(m.birthDate) : '',
    "Số Điện Thoại": m.phone || '',
    "Email": m.email || '',
    "Lớp": m.classGroup || '',
    "Chuyên Ngành": m.major || '',
    "Bậc Đào Tạo": m.trainingLevel || 'Cao đẳng',
    "Quê Quán / Địa Chỉ": m.homeTown || '',
    "Ban Sinh Hoạt": m.department || '',
    "Chức Vụ / Vai Trò": m.role || '',
    "Trạng Thái": m.status || '',
    "Ngày Tham Gia": m.joinDate ? formatDate(m.joinDate) : '',
    "Kỹ Năng Sở Trường": m.skills ? m.skills.join(', ') : '',
    "Ảnh Đại Diện": m.avatar || '',
    "Ghi Chú": m.notes || ''
  }));

  // Sử dụng SheetJS
  const ws = XLSX.utils.json_to_sheet(excelData);
  
  // Thiết lập độ rộng cột
  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 15 }, // Mã TV
    { wch: 25 }, // Họ tên
    { wch: 15 }, // MSSV
    { wch: 10 }, // Giới tính
    { wch: 14 }, // Ngày sinh
    { wch: 14 }, // SĐT
    { wch: 26 }, // Email
    { wch: 18 }, // Lớp
    { wch: 25 }, // Chuyên ngành
    { wch: 14 }, // Bậc
    { wch: 30 }, // Quê quán
    { wch: 25 }, // Ban
    { wch: 22 }, // Chức vụ
    { wch: 16 }, // Trạng thái
    { wch: 14 }, // Ngày vào
    { wch: 30 }, // Kỹ năng
    { wch: 35 }, // Ảnh đại diện
    { wch: 30 }  // Ghi chú
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DanhSachThanhVien");
  XLSX.writeFile(wb, fileName);

  Swal.fire({
    icon: 'success',
    title: 'Xuất file thành công!',
    text: `Đã xuất ${dataList.length} hồ sơ thành viên ra file "${fileName}".`
  });
}

// NHẬP DỮ LIỆU TỪ FILE EXCEL (Admin only)
function handleExcelImport(event) {
  if (!isAdmin()) {
    promptAdminLogin('nhập danh sách thành viên từ file Excel');
    event.target.value = '';
    return;
  }

  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!jsonData || jsonData.length === 0) {
        Swal.fire('Lỗi', 'File Excel không có dữ liệu!', 'error');
        return;
      }

      let importedCount = 0;
      const currentYear = new Date().getFullYear();

      jsonData.forEach((row, idx) => {
        const fullName = row['Họ và Tên'] || row['Họ tên'] || row['FullName'] || row['Họ và tên'];
        if (!fullName) return;

        const studentId = (row['MSSV'] || row['Mã SV'] || row['StudentID'] || '').toString().trim().toUpperCase();
        const phone = (row['Số Điện Thoại'] || row['SĐT'] || row['Phone'] || '').toString().trim();
        const role = row['Chức Vụ / Vai Trò'] || row['Chức vụ'] || row['Vai trò'] || 'Cộng tác viên';
        const department = row['Ban Sinh Hoạt'] || row['Ban'] || 'Ban Hậu cần';
        const rawAvatar = row['Ảnh Đại Diện'] || row['Link Ảnh'] || row['Ảnh đại diện'] || row['Link ảnh'] || row['Avatar'] || '';
        const avatar = normalizeAvatarUrl(rawAvatar);

        const newId = `TD-${currentYear}-${(members.length + idx + 1).toString().padStart(3, '0')}`;

        const newMember = {
          id: newId,
          fullName: fullName.toString().trim(),
          studentId: studentId,
          gender: row['Giới Tính'] || row['Giới tính'] || 'Nam',
          birthDate: row['Ngày Sinh'] || '',
          phone: phone,
          email: row['Email'] || '',
          facebook: '',
          classGroup: row['Lớp'] || '',
          major: row['Chuyên Ngành'] || row['Ngành'] || '',
          trainingLevel: row['Bậc Đào Tạo'] || 'Cao đẳng',
          homeTown: row['Quê Quán / Địa Chỉ'] || row['Quê quán'] || '',
          department: department,
          role: role,
          status: row['Trạng Thái'] || 'Đang hoạt động',
          joinDate: new Date().toISOString().split('T')[0],
          skills: row['Kỹ Năng Sở Trường'] ? row['Kỹ Năng Sở Trường'].split(',').map(s => s.trim()) : [],
          notes: row['Ghi Chú'] || 'Nhập từ file Excel',
          avatar: avatar || DEFAULT_AVATAR
        };

        members.push(newMember);
        importedCount++;
      });

      saveMembersToStorage(members);
      renderAll();

      Swal.fire('Nhập thành công!', `Đã nạp thành công ${importedCount} hồ sơ vào hệ thống.`, 'success');
    } catch (err) {
      console.error(err);
      Swal.fire('Lỗi xử lý file', 'Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng file!', 'error');
    }
  };
  reader.readAsArrayBuffer(file);
  event.target.value = ''; // Reset input file
}

// Sao lưu & Phục hồi JSON
function exportJsonBackup() {
  const jsonStr = JSON.stringify(members, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SAO_LUU_CLB_TRONG_DONG_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function handleJsonRestore(event) {
  if (!isAdmin()) {
    promptAdminLogin('khôi phục dữ liệu từ bản sao lưu JSON');
    event.target.value = '';
    return;
  }

  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (Array.isArray(parsed)) {
        members = parsed;
        saveMembersToStorage(members);
        renderAll();
        Swal.fire('Khôi phục thành công!', `Đã khôi phục ${members.length} hồ sơ từ bản sao lưu.`, 'success');
      } else {
        Swal.fire('Lỗi', 'Cấu trúc file sao lưu không hợp lệ!', 'error');
      }
    } catch (err) {
      Swal.fire('Lỗi', 'Không thể đọc file JSON sao lưu!', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// Khôi phục dữ liệu mẫu ban đầu (Admin only)
function handleResetDefaultData() {
  if (!isAdmin()) {
    promptAdminLogin('đặt lại dữ liệu mẫu của CLB');
    return;
  }

  Swal.fire({
    title: 'Xóa toàn bộ dữ liệu nhân sự?',
    text: 'Thao tác này sẽ xóa sạch toàn bộ hồ sơ trong hệ thống để bạn bắt đầu nhập dữ liệu mới của CLB!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e11d48',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Đồng ý xóa trắng',
    cancelButtonText: 'Hủy'
  }).then((res) => {
    if (res.isConfirmed) {
      members = resetToDefaultData();
      selectedMemberIds.clear();
      renderAll();
      updateBatchActionButtons();
      Swal.fire('Đã xóa trắng!', 'Hệ thống đã được làm sạch toàn bộ dữ liệu, sẵn sàng để bạn cập nhật thông tin mới.', 'success');
    }
  });
}

// Định dạng ngày DD/MM/YYYY
function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// ==================== QUẢN LÝ LIGHTBOX REVIEW HOẠT ĐỘNG CLB ====================
const clubActivitiesData = [
  {
    image: 'assets/hoat-dong-van-nghe.jpg',
    badge: 'Giải Nhất Hội Thi',
    badgeColor: 'text-amber-300 bg-amber-400/20 border-amber-400/30',
    title: 'Hội Thi Văn Nghệ "Tri Ân Thầy Cô" (20/11)',
    tag: 'Đội Văn Nghệ Xung Kích',
    desc: 'Đội hình xung kích CLB Thanh niên Tình nguyện Trống Đồng đại diện Đoàn Bộ phận Cơ sở Đức Hoà tham gia Hội thi văn nghệ chào mừng Kỷ niệm 43 năm Ngày Nhà giáo Việt Nam (20/11/1982 - 20/11/2025). Với sự chuẩn bị công phu, trang phục truyền thống ấn tượng và tinh thần nhiệt huyết, tiết mục đã xuất sắc giành Giải Nhất chung cuộc.',
    review: 'Sân khấu bùng nổ cảm xúc, kết nối tinh thần đoàn kết và tự hào của tuổi trẻ Cao đẳng Long An cơ sở Đức Hoà!'
  },
  {
    image: 'assets/hoat-dong-tiep-suc.jpg',
    badge: 'Honda Khánh An',
    badgeColor: 'text-sky-300 bg-sky-400/20 border-sky-400/30',
    title: 'Hỗ Trợ Thay Nhớt Miễn Phí Cùng Honda Khánh An',
    tag: 'Đồng Hành Cùng Doanh Nghiệp',
    desc: 'Chương trình đồng hành vì cộng đồng giữa CLB Thanh niên Tình nguyện Trống Đồng và Hệ thống HEAD Honda Khánh An. Các bạn đoàn viên, tình nguyện viên hỗ trợ điều phối phương tiện, phát phiếu thứ tự, hỗ trợ kỹ thuật viên và hướng dẫn người dân, học sinh - sinh viên đến thay nhớt xe máy miễn phí tại khuôn viên trường.',
    review: 'Hoạt động ý nghĩa, thiết thực, giúp sinh viên có phương tiện an toàn đến trường và tăng cường gắn kết giữa nhà trường, doanh nghiệp và đoàn viên thanh niên!'
  },
  {
    image: 'assets/hoat-dong-thu-vien.jpg',
    badge: 'Trao Giấy Khen Tuyên Dương',
    badgeColor: 'text-emerald-300 bg-emerald-400/20 border-emerald-400/30',
    title: 'Hỗ Trợ Trao Giấy Khen Nhân Ngày Tuyên Truyền Không Ma Tuý',
    tag: 'Khen Thưởng & Phong Trào',
    desc: 'Lễ tổng kết và hỗ trợ trao tặng Giấy khen cho các thành viên, đoàn viên xung kích CLB Trống Đồng đã có thành tích xuất sắc trong công tác phối hợp tổ chức và tham gia chuỗi hoạt động Ngày hội Tuyên truyền phòng chống ma túy học đường tại Cơ sở Đức Hoà. Sự ghi nhận kịp thời là nguồn động lực lớn để tuổi trẻ tiếp tục cống hiến.',
    review: 'Niềm vinh dự và tự hào khi những đóng góp tích cực trong việc lan tỏa lối sống đẹp, bài trừ ma túy của các thành viên được Đoàn trường biểu dương, khen thưởng!'
  },
  {
    image: 'assets/hoat-dong-tuyen-truyen.jpg',
    badge: 'Bản Lĩnh Trẻ',
    badgeColor: 'text-rose-300 bg-rose-400/20 border-rose-400/30',
    title: 'Tiểu Phẩm Kịch "Sinh Viên Nói Không Với Ma Túy"',
    tag: 'Tuyên Truyền & Sân Khấu',
    desc: 'Tiểu phẩm kịch tuyên truyền phòng chống ma túy và tệ nạn xã hội do các bạn thành viên CLB Trống Đồng tự biên tự diễn trên sân khấu hội trường lớn. Thông qua lối diễn xuất tự nhiên, hài hước nhưng sâu sắc, thông điệp "Sinh viên bản lĩnh - Nói không với ma túy - Vì tương lai tương sáng" đã chạm đến đông đảo bạn trẻ.',
    review: 'Cách tuyên truyền gần gũi, sáng tạo và ý nghĩa, thể hiện rõ bản lĩnh và trách nhiệm công dân của sinh viên thời đại mới.'
  }
];

let currentClubActivityIndex = 0;

function openClubActivityModal(index) {
  currentClubActivityIndex = index;
  updateClubActivityModalContent();
  const modal = document.getElementById('clubActivityModal');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function closeClubActivityModal() {
  const modal = document.getElementById('clubActivityModal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

function prevClubActivity() {
  currentClubActivityIndex = (currentClubActivityIndex - 1 + clubActivitiesData.length) % clubActivitiesData.length;
  updateClubActivityModalContent();
}

function nextClubActivity() {
  currentClubActivityIndex = (currentClubActivityIndex + 1) % clubActivitiesData.length;
  updateClubActivityModalContent();
}

function updateClubActivityModalContent() {
  const item = clubActivitiesData[currentClubActivityIndex];
  if (!item) return;

  const modalImg = document.getElementById('activityModalImg');
  const modalBadge = document.getElementById('activityModalBadge');
  const modalStep = document.getElementById('activityModalStep');
  const modalTitle = document.getElementById('activityModalTitle');
  const modalTag = document.getElementById('activityModalTag');
  const modalDesc = document.getElementById('activityModalDesc');
  const modalReviewText = document.getElementById('activityModalReviewText');

  if (modalImg) modalImg.src = item.image;
  if (modalBadge) {
    modalBadge.textContent = item.badge;
    modalBadge.className = `text-xs font-bold px-2.5 py-0.5 rounded-full border ${item.badgeColor}`;
  }
  if (modalStep) modalStep.textContent = `Ảnh ${currentClubActivityIndex + 1} / ${clubActivitiesData.length}`;
  if (modalTitle) modalTitle.textContent = item.title;
  if (modalTag) modalTag.textContent = item.tag;
  if (modalDesc) modalDesc.textContent = item.desc;
  if (modalReviewText) modalReviewText.textContent = item.review;
}

// Lắng nghe phím bấm Esc, mũi tên trái / phải để điều hướng modal & phím tắt xem ảnh
document.addEventListener('keydown', (e) => {
  const avatarModal = document.getElementById('avatarPreviewModal');
  if (avatarModal && !avatarModal.classList.contains('hidden')) {
    if (e.key === 'Escape') {
      closeAvatarPreviewModal();
      return;
    }
    if (e.key === '+' || e.key === '=') zoomAvatar(0.2);
    if (e.key === '-' || e.key === '_') zoomAvatar(-0.2);
    if (e.key === 'r' || e.key === 'R') rotateAvatar();
  }

  const modal = document.getElementById('clubActivityModal');
  if (modal && !modal.classList.contains('hidden')) {
    if (e.key === 'Escape') closeClubActivityModal();
    if (e.key === 'ArrowLeft') prevClubActivity();
    if (e.key === 'ArrowRight') nextClubActivity();
  }
});
