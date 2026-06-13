const KATEGORI_TEMUAN = [
  {
    id: 'tenant',
    nama: 'Tenant & Ruang Sewa',
    icon: 'Building',
    items: [
      { kode: 'T001', nama: 'Renovasi Sesuai Aturan' },
      { kode: 'T002', nama: 'Renovasi Melanggar Aturan' },
      { kode: 'T003', nama: 'Overtime Tenant' },
      { kode: 'T004', nama: 'Pintu Tidak Terkunci' },
    ]
  },
  {
    id: 'fasilitas',
    nama: 'Fasilitas Gedung',
    icon: 'Settings',
    items: [
      { kode: 'F001', nama: 'Service AHU' },
      { kode: 'F002', nama: 'Service Chiller' },
      { kode: 'F003', nama: 'Lift Maintenance' },
      { kode: 'F004', nama: 'Eskalator Maintenance' },
      { kode: 'F005', nama: 'Instalasi Listrik' },
      { kode: 'F006', nama: 'Pipa' },
    ]
  },
  {
    id: 'gangguan',
    nama: 'Gangguan Operasional',
    icon: 'AlertTriangle',
    items: [
      { kode: 'G001', nama: 'Air Bocor' },
      { kode: 'G002', nama: 'Alarm Bunyi' },
      { kode: 'G003', nama: 'Lampu Mati' },
      { kode: 'G004', nama: 'Keributan' },
      { kode: 'G005', nama: 'Demonstrasi' },
      { kode: 'G006', nama: 'Listrik Mati' },
      { kode: 'G007', nama: 'Bau Asap' },
      { kode: 'G008', nama: 'Api' },
    ]
  },
  {
    id: 'event',
    nama: 'Event & Aktivitas Khusus',
    icon: 'Calendar',
    items: [
      { kode: 'E001', nama: 'Pameran Tenant' },
      { kode: 'E002', nama: 'Event Tenant' },
      { kode: 'E003', nama: 'Aktivitas Khusus Tenant' },
    ]
  },
  {
    id: 'lainnya',
    nama: 'Lain-Lain',
    icon: 'MoreHorizontal',
    items: [
      { kode: 'O001', nama: 'Temuan Lainnya' },
      { kode: 'O002', nama: 'Kondisi Tidak Normal' },
      { kode: 'O003', nama: 'Catatan Petugas' },
    ]
  }
];

export const STATUS_PATROLI = [
  { value: 'normal', label: 'Normal', color: '#10b981' },
  { value: 'temuan', label: 'Temuan', color: '#f59e0b' },
  { value: 'critical', label: 'Critical', color: '#ef4444' },
];

export default KATEGORI_TEMUAN;
