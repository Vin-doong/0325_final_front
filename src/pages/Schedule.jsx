import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';
import axios from 'axios';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import Swal from 'sweetalert2';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import Header from '../components/include/Header';
import './Schedule.css';

// Localizer 설정
const localizer = momentLocalizer(moment);

// Drag and Drop 캘린더
const DnDCalendar = withDragAndDrop(Calendar);

// Styled Components로 캘린더 스타일링
const StyledCalendar = styled(Calendar)`
  .rbc-event {
    background-color: #209696; /* 이벤트 배경 색상 */
    color: white;
    border-radius: 4px;
    transition: background-color 0.3s ease;
    &:hover {
      background-color: #1a8c8c; /* 마우스 오버 시 색상 변경 */
    }
  }
  .rbc-day-bg {
    background-color: #f0f8ff; /* 날짜 배경 색상 */
  }
  .rbc-today {
    background-color: #e0f7fa; /* 오늘 날짜 강조 */
  }
  .rbc-time-slot {
    border-left: 2px solid #209696; /* 시간 슬롯 경계선 */
  }
`;

// Axios 인스턴스 설정 (백엔드와의 통신을 위한 기본 설정)
const instance = axios.create({
  baseURL: 'http://localhost:8000', // 백엔드 서버 주소
  headers: {
    'Content-Type': 'application/json',
  },
});

// 토큰 인증 추가 (JWT 토큰 사용 시 필요)
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken'); // JWT 토큰 가져오기
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const Schedule = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date());
  const [weeklyPlan, setWeeklyPlan] = useState({});
  const [todayPlan, setTodayPlan] = useState([]);
  const [events, setEvents] = useState([]);
  const [supplements, setSupplements] = useState([]);
  
  // 일정 등록 및 복용 기록 입력 통합 상태
  const [supplementName, setSupplementName] = useState('');
  const [memo, setMemo] = useState('');
  const [intakeTime, setIntakeTime] = useState('아침'); // 아침, 점심, 저녁 중 선택
  const [startDate, setStartDate] = useState(moment().format('YYYY-MM-DD')); // 현재 날짜를 기본값으로
  const [duration, setDuration] = useState(30); // 복용 기간 (일 수), 기본값 30일
  const [customDuration, setCustomDuration] = useState('30');
  const [durationOption, setDurationOption] = useState('30'); // 30일, 60일, 90일, 사용자 지정

  // 상태별 색상 클래스
  const getStatusClass = (status) => {
    switch (status) {
      case '완료':
        return 'bg-green-200';
      case '미완료':
        return 'bg-red-200';
      case '예정':
        return 'bg-gray-200';
      default:
        return '';
    }
  };

  // 계정 유형 확인 (소셜 계정 여부)
  const checkAccountType = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        navigate('/login');
        return;
      }

      await instance.get('/api/member/account-type');
    } catch (error) {
      console.error('계정 유형 확인 오류:', error);
    }
  };

  // 주간 계획 조회 (백엔드 엔드포인트: /api/weekly-plan)
  const fetchWeeklyPlan = async () => {
    try {
      const response = await instance.get('/api/weekly-plan');
      setWeeklyPlan(response.data);
    } catch (error) {
      console.error('Error fetching weekly plan:', error);
      // 더미 데이터 대신 빈 상태로 설정
      setWeeklyPlan({});
    }
  };

  // 오늘의 계획 조회 (백엔드 엔드포인트: /api/today-plan)
  const fetchTodayPlan = async () => {
    try {
      const response = await instance.get('/api/today-plan');
      setTodayPlan(response.data);
    } catch (error) {
      console.error('Error fetching today plan:', error);
      // 더미 데이터 대신 빈 상태로 설정
      setTodayPlan([]);
    }
  };

  // 이벤트 목록 조회 (백엔드 엔드포인트: /api/events)
  const fetchEvents = async () => {
    try {
      const response = await instance.get('/api/events');
      const formattedEvents = response.data.map((event) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      }));
      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      // 더미 데이터 대신 빈 상태로 설정
      setEvents([]);
    }
  };

  // 영양제 목록 조회 (백엔드 엔드포인트: /api/supplements)
  const fetchSupplements = async () => {
    try {
      const response = await instance.get('/api/supplements');
      setSupplements(response.data);
    } catch (error) {
      console.error('Error fetching supplements:', error);
      // 더미 데이터 대신 빈 상태로 설정
      setSupplements([]);
    }
  };

  // 컴포넌트 마운트 시 초기 데이터 로딩
  useEffect(() => {
    checkAccountType();
    fetchWeeklyPlan();
    fetchTodayPlan();
    fetchEvents();
    fetchSupplements();
  }, []);

  // 날짜 계산 헬퍼 함수
  const calculateEndDate = (startDate, durationDays) => {
    const start = moment(startDate);
    const end = start.clone().add(durationDays - 1, 'days');
    return end.format('YYYY-MM-DD');
  };

  // 기간 옵션 변경 핸들러
  const handleDurationOptionChange = (option) => {
    setDurationOption(option);
    if (option === 'custom') {
      setDuration(parseInt(customDuration) || 30);
    } else {
      setDuration(parseInt(option));
      setCustomDuration(option);
    }
  };

  // 사용자 지정 기간 변경 핸들러
  const handleCustomDurationChange = (e) => {
    const value = e.target.value;
    setCustomDuration(value);
    if (durationOption === 'custom') {
      setDuration(parseInt(value) || 30);
    }
  };

  // 이벤트 드래그 앤 드롭 처리
  const moveEvent = ({ event, start, end }) => {
    const updatedEvents = events.map((existingEvent) =>
      existingEvent.id === event.id ? { ...existingEvent, start, end } : existingEvent
    );
    setEvents(updatedEvents);
    // 백엔드 업데이트 (엔드포인트: PUT /api/events/:id)
    try {
      instance.put(`/api/events/${event.id}`, { ...event, start, end });
    } catch (error) {
      console.error('이벤트 업데이트 중 오류:', error);
    }
  };

  // 이벤트 크기 조절 처리
  const resizeEvent = ({ event, start, end }) => {
    const updatedEvents = events.map((existingEvent) =>
      existingEvent.id === event.id ? { ...existingEvent, start, end } : existingEvent
    );
    setEvents(updatedEvents);
    // 백엔드 업데이트 (엔드포인트: PUT /api/events/:id)
    try {
      instance.put(`/api/events/${event.id}`, { ...event, start, end });
    } catch (error) {
      console.error('이벤트 크기 조절 중 오류:', error);
    }
  };

  // 이벤트 삭제
  const handleDeleteEvent = async (event) => {
    try {
      await instance.delete(`/api/events/${event.id}`); // 백엔드 엔드포인트: DELETE /api/events/:id
      setEvents(events.filter((e) => e.id !== event.id));
    } catch (error) {
      alert('이벤트 삭제 중 오류가 발생했습니다.');
      console.error(error);
    }
  };

  // 통합 복용 일정 추가
  const handleAddIntakeSchedule = async (e) => {
    e.preventDefault();
    if (!supplementName) {
      Swal.fire({
        title: '알림',
        text: '영양제 이름을 입력해주세요.',
        icon: 'warning',
      });
      return;
    }

    // 오늘 날짜보다 이전 날짜 체크
    if (moment(startDate).isBefore(moment().startOf('day'))) {
      Swal.fire({
        title: '알림',
        text: '복용 시작일은 오늘 이후로 설정해주세요.',
        icon: 'warning',
      });
      return;
    }

    // 기간 유효성 검사
    if (duration <= 0) {
      Swal.fire({
        title: '알림',
        text: '유효한 복용 기간을 입력해주세요.',
        icon: 'warning',
      });
      return;
    }

    try {
      // 복용 종료일 계산
      const endDate = calculateEndDate(startDate, duration);
      
      // 복용 일정 데이터 준비
      const scheduleData = {
        supplementName: supplementName,
        intakeTime: intakeTime,
        intakeStart: startDate,
        intakeDistance: duration,
        intakeEnd: endDate,
        memo: memo
      };

      // 백엔드 API 호출 (복용 일정 등록)
      const response = await instance.post('/api/schedules', scheduleData);
      
      // 성공적으로 등록된 경우
      if (response.status === 200 || response.status === 201) {
        // 필드 초기화
        setSupplementName('');
        setMemo('');
        
        // 새 이벤트 생성 (캘린더에 표시)
        const newEvent = {
          id: response.data.scheduleId || new Date().getTime(),
          title: `${intakeTime} - ${supplementName}`,
          start: new Date(startDate),
          end: new Date(endDate),
          allDay: true,
        };
        
        setEvents([...events, newEvent]);
        
        // 성공 메시지
        Swal.fire({
          title: '성공',
          text: '복용 일정이 성공적으로 등록되었습니다.',
          icon: 'success',
        });
        
        // 데이터 다시 불러오기
        fetchTodayPlan();
        fetchWeeklyPlan();
      }
    } catch (error) {
      console.error('복용 일정 등록 중 오류:', error);
      Swal.fire({
        title: '오류',
        text: '복용 일정 등록 중 오류가 발생했습니다.',
        icon: 'error',
      });
    }
  };

  // 알림 기능
  useEffect(() => {
    const scheduleNotifications = () => {
      todayPlan.forEach((item) => {
        const now = new Date();
        const eventTime = new Date(now.toDateString() + ' ' + item.time);
        const timeDiff = eventTime - now;
        if (timeDiff > 0 && timeDiff < 86400000) {
          setTimeout(() => {
            Swal.fire({
              title: `${item.supplement} 복용 시간입니다!`,
              text: `지금 ${item.supplement}을(를) 복용하세요.`,
              icon: 'info',
              confirmButtonText: '확인',
            });
          }, timeDiff);
        }
      });
    };
    scheduleNotifications();
  }, [todayPlan]);

  // 주간 날짜 구하기
  const getWeekDates = (currentDate) => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1); // 월요일 기준

    return Array.from({ length: 7 }, (_, i) => {
      const newDate = new Date(startOfWeek);
      newDate.setDate(startOfWeek.getDate() + i);
      return newDate;
    });
  };

  const weekDates = getWeekDates(date);

  return (
    <div className="bg-gray-50 font-['Noto_Sans_KR']">
      {/* 헤더 */}
      <Header />
      
      {/* 메인 콘텐츠 */}
      <main className="p-6 mt-4 container mx-auto">
        <div className="max-w-7xl mx-auto">
          {/* 오늘의 영양제 */}
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">오늘의 영양제</h1>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white shadow rounded-lg p-5 flex items-center">
              <i className="fas fa-sun text-yellow-400 text-2xl"></i>
              <div className="ml-3">
                <h4 className="text-lg font-medium text-gray-900">아침</h4>
                {todayPlan.filter(item => item.time === '아침').map((item, index) => (
                  <p key={index} className="text-sm text-gray-900">{item.supplement}</p>
                ))}
                {todayPlan.filter(item => item.time === '아침').length === 0 && (
                  <p className="text-sm text-gray-500">복용할 영양제가 없습니다.</p>
                )}
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-5 flex items-center">
              <i className="fas fa-cloud-sun text-orange-400 text-2xl"></i>
              <div className="ml-3">
                <h4 className="text-lg font-medium text-gray-900">점심</h4>
                {todayPlan.filter(item => item.time === '점심').map((item, index) => (
                  <p key={index} className="text-sm text-gray-900">{item.supplement}</p>
                ))}
                {todayPlan.filter(item => item.time === '점심').length === 0 && (
                  <p className="text-sm text-gray-500">복용할 영양제가 없습니다.</p>
                )}
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-5 flex items-center">
              <i className="fas fa-moon text-blue-500 text-2xl"></i>
              <div className="ml-3">
                <h4 className="text-lg font-medium text-gray-900">저녁</h4>
                {todayPlan.filter(item => item.time === '저녁').map((item, index) => (
                  <p key={index} className="text-sm text-gray-900">{item.supplement}</p>
                ))}
                {todayPlan.filter(item => item.time === '저녁').length === 0 && (
                  <p className="text-sm text-gray-500">복용할 영양제가 없습니다.</p>
                )}
              </div>
            </div>
          </div>
          
          {/* 주간 복용 계획 */}
          <div className="bg-white shadow rounded-lg p-5 mb-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📅 주간 복용 계획</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2 text-center">
              {weekDates.map((day, i) => {
                const dayKey = day.toLocaleDateString('en-US', { weekday: 'long' });
                const dayData = weeklyPlan[dayKey] || {};
                const status = dayData.status || '미완료';
                const supplements = dayData.items || [];
                
                return (
                  <div key={i} className={`p-3 border rounded-lg cursor-pointer ${getStatusClass(status)}`}>
                    <p className="text-sm font-semibold">{day.toLocaleDateString('ko-KR', { weekday: 'short' })}</p>
                    <p className="text-xs text-gray-600">{day.toLocaleDateString()}</p>
                    <ul className="mt-1 text-xs text-gray-700">
                      {supplements.length > 0 ? (
                        supplements.map((item, j) => (
                          <li key={j}>✅ {item}</li>
                        ))
                      ) : (
                        <li>❌ 없음</li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* 복용 일정 캘린더 */}
          <div className="mt-4 p-4 bg-white shadow rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">복용 일정</h2>
            <div style={{ height: 500 }}>
              <StyledCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                onSelectSlot={(slotInfo) => setDate(slotInfo.start)}
                onEventDrop={moveEvent}
                onEventResize={resizeEvent}
                selectable={true}
                resizable={true}
                droppable={true}
                components={{
                  event: (props) => (
                    <div
                      {...props}
                      className="bg-teal-500 text-white p-2 rounded cursor-pointer hover:bg-teal-600 flex items-center justify-between"
                    >
                      <span>{props.event.title}</span>
                      <button onClick={() => handleDeleteEvent(props.event)} className="text-red-500 ml-2">
                        ×
                      </button>
                    </div>
                  ),
                }}
              />
            </div>
            <p className="mt-4 text-gray-900">선택한 날짜: {date.toLocaleDateString()}</p>
          </div>
          
          {/* 복용 일정 입력 (통합) */}
          <div className="mt-4 p-4 bg-white shadow rounded-lg mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">복용 일정 등록</h2>
            <form onSubmit={handleAddIntakeSchedule}>
              {/* 영양제 이름 입력 필드 */}
              <div className="mb-4">
                <label htmlFor="supplementName" className="block text-sm font-medium text-gray-700 mb-2">
                  영양제 이름
                </label>
                <input
                  type="text"
                  id="supplementName"
                  value={supplementName}
                  onChange={(e) => setSupplementName(e.target.value)}
                  placeholder="영양제 이름을 입력하세요"
                  className="border rounded-md p-2 w-full"
                />
              </div>
              
              {/* 복용 시간대 선택 (아침/점심/저녁) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  복용 시간대
                </label>
                <div className="flex space-x-4">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="morning"
                      name="intakeTime"
                      value="아침"
                      checked={intakeTime === '아침'}
                      onChange={() => setIntakeTime('아침')}
                      className="mr-2"
                    />
                    <label htmlFor="morning">아침</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="noon"
                      name="intakeTime"
                      value="점심"
                      checked={intakeTime === '점심'}
                      onChange={() => setIntakeTime('점심')}
                      className="mr-2"
                    />
                    <label htmlFor="noon">점심</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="evening"
                      name="intakeTime"
                      value="저녁"
                      checked={intakeTime === '저녁'}
                      onChange={() => setIntakeTime('저녁')}
                      className="mr-2"
                    />
                    <label htmlFor="evening">저녁</label>
                  </div>
                </div>
              </div>
              
              {/* 복용 시작일 */}
              <div className="mb-4">
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  복용 시작일
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  min={moment().format('YYYY-MM-DD')} // 오늘 이전 날짜 선택 불가
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border rounded-md p-2 w-full"
                />
              </div>
              
              {/* 복용 기간 옵션 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  복용 기간
                </label>
                <div className="flex flex-wrap gap-3 mb-2">
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-md ${durationOption === '30' ? 'bg-teal-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => handleDurationOptionChange('30')}
                  >
                    30일
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-md ${durationOption === '60' ? 'bg-teal-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => handleDurationOptionChange('60')}
                  >
                    60일
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-md ${durationOption === '90' ? 'bg-teal-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => handleDurationOptionChange('90')}
                  >
                    90일
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-md ${durationOption === 'custom' ? 'bg-teal-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => handleDurationOptionChange('custom')}
                  >
                    직접 입력
                  </button>
                </div>
                
                {/* 직접 입력 옵션 선택 시 표시 */}
                {durationOption === 'custom' && (
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="1"
                      value={customDuration}
                      onChange={handleCustomDurationChange}
                      className="border rounded-md p-2 w-24 mr-2"
                    />
                    <span>일</span>
                  </div>
                )}
                
                {/* 복용 종료일 표시 */}
                <div className="mt-2 text-sm text-gray-600">
                  복용 종료일: {calculateEndDate(startDate, duration)}
                </div>
              </div>
              
              {/* 메모 */}
              <div className="mb-4">
                <label htmlFor="memo" className="block text-sm font-medium text-gray-700 mb-2">
                  메모
                </label>
                <textarea
                  id="memo"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="border rounded-md p-2 w-full"
                  rows="3"
                  placeholder="추가 메모를 입력하세요 (선택사항)"
                ></textarea>
              </div>
              
              {/* 제출 버튼 */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-teal-500 text-white px-6 py-2 rounded-md hover:bg-teal-600 transition-colors"
                >
                  일정 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Schedule;