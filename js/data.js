/**
 * Dữ liệu Quản Lý CLB TNTN Trống Đồng
 * Trường Cao đẳng Long An - Cơ sở Đức Hoà
 * Đoàn Bộ phận Cơ sở Đức Hoà
 */

const STORAGE_KEY = 'CLB_TRONG_DONG_MEMBERS_DATA';
const SETTINGS_KEY = 'CLB_TRONG_DONG_SETTINGS';
const DATA_CLEARED_FLAG = 'CLB_TRONG_DONG_CLEARED_INIT_V2';

// Danh sách ban đầu làm trống theo yêu cầu người dùng để tự cập nhật thông tin mới
const INITIAL_MEMBERS = [];

// Khởi tạo dữ liệu và đọc từ localStorage
function getStoredMembers() {
  // Tự động xóa sạch dữ liệu mẫu cũ nếu còn lưu trong trình duyệt
  if (!localStorage.getItem(DATA_CLEARED_FLAG)) {
    localStorage.setItem(DATA_CLEARED_FLAG, 'true');
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return [];
  }

  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return [];
  }
  try {
    const list = JSON.parse(data);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.error("Lỗi đọc dữ liệu:", e);
    return [];
  }
}

function saveMembersToStorage(members) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
}

function resetToDefaultData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  return [];
}
