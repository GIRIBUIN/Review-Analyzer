// 전역 상태 관리
const STATE = {
    currentScreen: 'main',
    isAuthenticated: false,
    user: { user_id: null, user_name: null },
    chatHistory: [],
    analysisResult: null,
    savedData: [],
    tempUrl: null,
    relatedProducts: null, // 유사 상품 링크 저장
    recommendChoice: null, // 유사 상품 추천 선택 상태: null(미선택), 'yes', 'no'
};

// DOM 요소 캐시
const elements = {
    contentContainer: document.getElementById('content-container'),
    authLink: document.getElementById('auth-link'),
    userInfo: document.getElementById('user-info'),
    currentUsername: document.getElementById('current-username'),
    modalContainer: document.getElementById('modal-container'),
};
// --- 초기화 ---
async function initialize() {
    // 서버에 현재 로그인 상태를 확인하여 초기 상태를 설정
    await checkLoginStatus();
    STATE.currentScreen = 'currentAnalysis';
    updateUI();
}

// --- 헬퍼 함수 ---

// UI 상태 업데이트 및 화면 렌더링
function updateUI() {
    // 1. 네비게이션 메뉴 스타일 업데이트
    document.querySelectorAll('nav a').forEach(a => {
        a.classList.remove('bg-indigo-50', 'text-indigo-700');
        a.classList.add('text-gray-700', 'hover:bg-gray-100');
    });
    const activeScreen = STATE.currentScreen === 'login' || STATE.currentScreen === 'register' ? 'currentAnalysis' : STATE.currentScreen;
    const activeMenu = document.getElementById(`menu-${activeScreen}`);
    if (activeMenu) {
        activeMenu.classList.add('bg-indigo-50', 'text-indigo-700');
        activeMenu.classList.remove('text-gray-700', 'hover:bg-gray-100');
    }

    // 2. 인증 상태 UI 업데이트
    if (STATE.isAuthenticated) {
        // 로그인 상태: 로그아웃 버튼 보이기 + 유저 정보 보이기
        elements.authLink.innerHTML = `
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3v-1m18-8V9a3 3 0 00-3-3h-2"></path>
            </svg>
            로그아웃
        `;
        elements.authLink.onclick = handleLogout;
        elements.authLink.classList.remove('hidden');
        elements.userInfo.classList.remove('hidden');
        elements.currentUsername.textContent = STATE.user.user_name;
    } else {
        // 비로그인 상태: 로그인 버튼 보이기 + 유저 정보 숨기기
        elements.authLink.innerHTML = `
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3v-1m18-8V9a3 3 0 00-3-3h-2"></path>
            </svg>
            로그인
        `;
        elements.authLink.onclick = () => changeScreen('login');
        elements.authLink.classList.remove('hidden');
        elements.userInfo.classList.add('hidden');
    }

    // 3. 콘텐츠 렌더링
    renderContent();
}

// 화면 전환 함수
async function changeScreen(screen) {
    // '새 분석 시작' (main) 클릭 시 채팅 기록 초기화
    if (screen === 'main') {
        STATE.chatHistory = [];
        STATE.analysisResult = null;
        screen = 'currentAnalysis'; // '현재 분석 화면'으로 이동
    }

    // '저장된 리뷰'는 로그인해야 접근 가능
    if (screen === 'savedReviews') {
        if (!STATE.isAuthenticated) {
            showModal(getLoginRequiredModal());
            return;
        }
        await loadSavedReviews();
    }

    STATE.currentScreen = screen;
    updateUI();
}

// 채팅 기록 및 화면 업데이트
function pushChat(role, content, type = 'text') {
    STATE.chatHistory.push({ role, content, type, timestamp: new Date().toLocaleTimeString() });
    renderChatArea();
}

// --- 모달 함수 ---

function showModal(contentHtml) {
    elements.modalContainer.innerHTML = contentHtml;
    elements.modalContainer.classList.remove('hidden');
}

function closeModal() {
    elements.modalContainer.classList.add('hidden');
    elements.modalContainer.innerHTML = '';
}

// --- 로그인/회원가입 처리 ---
async function checkLoginStatus() {
    try {
        const response = await fetch('/api/check_login');
        const data = await response.json();
        if (data.is_logged_in) {
            STATE.isAuthenticated = true;
            STATE.user = { user_id: data.user_id, user_name: data.user_name };
        } else {
            STATE.isAuthenticated = false;
            STATE.user = { user_id: null, user_name: null };
        }
    } catch (error) {
        console.error("로그인 상태 확인 중 오류:", error);
        STATE.isAuthenticated = false;
    }
}
async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const user_name = form.user_name.value;
    const messageBox = document.getElementById('login-message'); // 메시지 박스 선택

    // 메시지 초기화
    messageBox.innerText = '';

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_name: user_name }),
        });
        const data = await response.json();

        if (response.ok) {
            STATE.isAuthenticated = true;
            STATE.user = { user_id: data.user_id, user_name: user_name };
            closeModal(); // 성공 시 모달 닫기 (메시지 없음)
            changeScreen('currentAnalysis');
        } else {
            // 실패 시 인라인 메시지 표시
            messageBox.innerText = data.message || "로그인에 실패했습니다. 아이디를 확인해주세요.";
        }
    } catch (error) {
        messageBox.innerText = "서버와 통신 중 오류가 발생했습니다.";
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    const user_name = form.user_name.value;
    const messageBox = document.getElementById('register-message'); // 메시지 박스 선택

    // 메시지 초기화
    messageBox.innerText = '';
    messageBox.classList.remove('text-green-600'); // 성공 색상 제거
    messageBox.classList.add('text-red-500'); // 실패 색상 기본

    if (!user_name) {
        messageBox.innerText = "아이디를 입력해야 합니다.";
        return;
    }

    try {
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_name: user_name }),
        });
        const data = await response.json();

        if (response.status === 201) {
            // 성공 시: 로그인 화면으로 전환 (alert 제거)
            changeScreen('login');
            // 로그인 화면으로 전환된 후, 로그인 폼의 메시지 박스에 안내 문구를 띄우고 싶다면 
            // 약간의 딜레이 후 DOM 조작이 필요하지만, 
            // 요청하신 대로 '로그인 창으로 넘어가는 것'만으로 충분하다면 여기까지만 작성합니다.
        } else {
            // 실패 시 (중복 아이디 등): 인라인 메시지 표시
            messageBox.innerText = data.message || "회원가입에 실패했습니다.";
        }
    } catch (error) {
        messageBox.innerText = "서버와 통신 중 오류가 발생했습니다.";
    }
}

async function handleLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        
        // 1. 상태 완전 초기화
        STATE.isAuthenticated = false;
        STATE.user = { user_id: null, user_name: null };
        STATE.chatHistory = [];     // 채팅 기록 초기화
        STATE.analysisResult = null; // 분석 결과 초기화
        STATE.savedData = [];
        STATE.tempUrl = null;
        STATE.relatedProducts = null;
        STATE.recommendChoice = null;

        // 2. 알림창(alert) 없이 바로 UI 업데이트
        // 'currentAnalysis' 화면을 강제로 다시 그려서 초기화된 상태(Welcome 메시지)를 보여줌
        changeScreen('currentAnalysis'); 
        
    } catch (error) {
        console.error("로그아웃 처리 중 오류:", error);
        // 로그아웃 오류는 사용자에게 굳이 알리지 않고 조용히 처리하거나 콘솔에만 남김
    }
}
// 1. "계정 삭제" 버튼 클릭 시 실행 (모달 띄우기)
function handleDeleteAccount() {
    showModal(getDeleteAccountConfirmModal());
}

// 2. 모달에서 "삭제하기" 버튼 클릭 시 실행 (실제 삭제 처리)
async function processDeleteAccount() {
    // 로딩 중임을 표시하기 위해 버튼 텍스트 변경 등을 할 수 있으나, 여기서는 생략하고 바로 요청
    
    try {
        const response = await fetch('/api/user', { method: 'DELETE' });
        const data = await response.json();

        if (response.ok) {
            // 성공 시: 상태 초기화 (로그아웃 로직과 동일하게 처리)
            STATE.isAuthenticated = false;
            STATE.user = { user_id: null, user_name: null };
            STATE.chatHistory = [];
            STATE.analysisResult = null;
            STATE.savedData = [];
            
            // 화면을 메인(currentAnalysis)으로 전환하여 초기 상태 보여줌
            changeScreen('currentAnalysis');

            // 성공 메시지 모달 띄우기 (alert 대신)
            showModal(getMessageModal('삭제 완료', '계정이 삭제되었습니다. 이용해 주셔서 감사합니다.'));
        } else {
            // 실패 시: 에러 메시지 모달
            showModal(getMessageModal('삭제 실패', data.message || "계정 삭제에 실패했습니다."));
        }
    } catch (error) {
        console.error("계정 삭제 중 오류:", error);
        showModal(getMessageModal('오류', "서버와 통신 중 오류가 발생했습니다."));
    }
}




// AI 분석 실행

async function runAnalysis(link, keyword) {
    const inputElement = document.getElementById('chat-input');
    const buttonElement = document.querySelector('#input-container button');

    if (!inputElement || !buttonElement) return;


    // 2. System: 크롤링/분석 시작 메시지
    pushChat('system', '제공된 링크로 접속하여 리뷰를 크롤링하고 AI 분석을 시작합니다. 잠시 기다려주세요...');

    // 입력 비활성화 (로딩 상태)
    inputElement.disabled = true;
    buttonElement.disabled = true;
    buttonElement.innerHTML = '<svg class="animate-spin w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356-2A8.001 8.001 0 004.582 19m9.625-3.5H19V14a5 5 0 10-10 0v1h10"></path></svg>'; // 로딩 아이콘 추가

    try {
        // 서버 통신: app.py의 /api/analyze 호출
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ link: link, keywords: keyword.split(',').map(k => k.trim()) }),
        });

        const data = await response.json();

        if (response.ok) {
            STATE.analysisResult = data.data;
            STATE.relatedProducts = null; // 새로운 분석 시작 시 유사 상품 초기화
            STATE.recommendChoice = null; // 새로운 분석 시작 시 선택 상태 초기화
            pushChat('system', `__ANALYSIS_RESULT_CARD__`);
        } else {
            const errorMessage = data.message || "알 수 없는 서버 오류가 발생했습니다.";
            pushChat('system', `리뷰 분석 한도로 인해 분석이 종료되었습니다. 잠시 후 다시 이용해주세요.`);
        }
    } catch (error) {
        console.error("Network or Fetch Error:", error);
        pushChat('system', `🚫 네트워크 연결 또는 분석 요청 중 오류가 발생했습니다: ${error.message}. 서버(Flask)가 실행 중인지 확인해주세요.`);
    } finally {
        // 입력 활성화 및 버튼 복원
        inputElement.disabled = false;
        buttonElement.disabled = false;
        buttonElement.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>'; // 원래 아이콘 복원
    }
}

// --- 분석 결과 저장 ---
async function handleSaveAnalysis() {
    if (!STATE.isAuthenticated) {
        showModal(getLoginRequiredModal());
        return;
    }
    if (!STATE.analysisResult) {
        showModal(getMessageModal('저장 불가', '분석 결과가 없습니다. 먼저 분석을 완료해 주세요.'));
        return;
    }
    if (STATE.recommendChoice === null) {
        showModal(getMessageModal('저장 불가', '유사 상품 추천을 선택해주세요.'));
        return;
    }

    // 저장 데이터 구성: 유사 상품 추천을 선택한 경우에만 related_products 포함
    const saveData = {
        ...STATE.analysisResult,
        related_products: STATE.recommendChoice === 'yes' ? (STATE.relatedProducts || []) : null
    };

    try {
        const response = await fetch('/api/library', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saveData), // 분석 결과 + 유사 상품 링크(선택 시)
        });

        const data = await response.json();

        if (response.status === 201) {
            showModal(getMessageModal('저장 성공', data.message));
        } else {
            showModal(getMessageModal('저장 실패', data.message || "저장에 실패했습니다."));
        }
    } catch (error) {
        showModal(getMessageModal('오류', "서버와 통신 중 오류가 발생했습니다."));
    }
}

async function loadSavedReviews() {
    try {
        const response = await fetch('/api/library', { method: 'GET' });
        const data = await response.json();
        if (response.ok) {
            STATE.savedData = data.data;
        } else {
            console.error("라이브러리 로딩 실패:", data.message);
            STATE.savedData = [];
        }
    } catch (error) {
        console.error("라이브러리 로딩 중 오류:", error);
        STATE.savedData = [];
    }
}

async function handleDeleteReview(analysisId) {
    if (!confirm("정말로 이 저장된 리뷰를 삭제하시겠습니까?")) {
        return;
    }

    try {
        const response = await fetch(`/api/library/${analysisId}`, { 
            method: 'DELETE' 
        });
        
        const data = await response.json();

        if (response.ok) {
            // 서버에서 최신 라이브러리 목록을 다시 가져옴 (동기화 보장)
            await loadSavedReviews();
            
            // 현재 화면이 저장된 리뷰 화면이면 화면을 다시 렌더링
            if (STATE.currentScreen === 'savedReviews') {
                renderSavedReviews();
            }
            
            // 성공 모달 표시
            showModal(getMessageModal('삭제 완료', '저장된 리뷰가 성공적으로 삭제되었습니다.'));
        } else {
            showModal(getMessageModal('삭제 실패', data.message || "삭제에 실패했습니다."));
        }
    } catch (error) {
        console.error('삭제 중 오류:', error);
        showModal(getMessageModal('오류', "서버와 통신 중 오류가 발생했습니다."));
    }
}

// 유사 상품 추천 수집
async function fetchRelatedProducts(url) {
    // 로딩 메시지 추가
    const loadingMsgIndex = STATE.chatHistory.length;
    pushChat('system', '🔍 유사 상품을 찾는 중입니다. 잠시만 기다려주세요...');
    
    try {
        const response = await fetch('/api/recommend-products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url }),
        });

        const data = await response.json();

        if (response.ok && data.status === 'success') {
            STATE.relatedProducts = data.data.links;
            // 로딩 메시지 제거
            STATE.chatHistory = STATE.chatHistory.filter((msg, idx) => idx !== loadingMsgIndex);
            // 채팅 히스토리에서 분석 결과 카드 메시지를 찾아 업데이트
            renderChatArea();
        } else {
            // 로딩 메시지를 오류 메시지로 교체
            STATE.chatHistory[loadingMsgIndex].content = `🚫 유사 상품 수집 중 오류가 발생했습니다: ${data.message || '알 수 없는 오류'}`;
            renderChatArea();
        }
    } catch (error) {
        console.error("유사 상품 수집 중 오류:", error);
        // 로딩 메시지를 오류 메시지로 교체
        if (STATE.chatHistory[loadingMsgIndex]) {
            STATE.chatHistory[loadingMsgIndex].content = `🚫 네트워크 연결 또는 유사 상품 수집 중 오류가 발생했습니다: ${error.message}`;
            renderChatArea();
        }
    }
}

// 유사 상품 추천 버튼 핸들러
async function handleRecommendProducts() {
    if (!STATE.analysisResult || !STATE.analysisResult.url) {
        pushChat('system', '🚫 분석 결과 URL이 없어 유사 상품을 찾을 수 없습니다.');
        return;
    }
    
    STATE.recommendChoice = 'yes';
    await fetchRelatedProducts(STATE.analysisResult.url);
}

// 유사 상품 추천 버튼 핸들러
async function handleRecommendProducts() {
    if (!STATE.analysisResult || !STATE.analysisResult.url) {
        pushChat('system', '🚫 분석 결과 URL이 없어 유사 상품을 찾을 수 없습니다.');
        return;
    }
    
    STATE.recommendChoice = 'yes';
    await fetchRelatedProducts(STATE.analysisResult.url);
}

// 유사 상품 추천 건너뛰기
function skipRecommendProducts() {
    STATE.recommendChoice = 'no';
    STATE.relatedProducts = null; // 아니오 선택 시 링크 초기화
    renderChatArea();
}

// --- 템플릿 HTML 생성 함수 ---

function getLoginForm() {
    return `
      <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm">
          <h2 class="text-2xl font-bold mb-6 text-gray-800 text-center">다시 오셨군요!</h2>
          <form onsubmit="handleLogin(event)">
              <div class="mb-4">
                  <label for="login-username" class="block text-sm font-medium text-gray-700 mb-1">아이디</label>
                  <input type="text" id="login-username" name="user_name" required class="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
              </div>
              
              <div id="login-message" class="text-red-500 text-sm text-center mb-4 min-h-[20px]"></div>

              <button type="submit" class="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors duration-200">로그인</button>
          </form>
          <div class="mt-4 text-center text-sm">
              계정이 없으신가요? <a href="#" onclick="changeScreen('register')" class="text-indigo-600 font-medium hover:underline">회원가입</a>
          </div>
      </div>
  `;
}

function getRegisterForm() {
    return `
      <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm">
          <h2 class="text-2xl font-bold mb-6 text-gray-800 text-center">회원가입</h2>
          <form onsubmit="handleRegister(event)">
              <div class="mb-4">
                  <label for="register-username" class="block text-sm font-medium text-gray-700 mb-1">아이디</label>
                  <input type="text" id="register-username" name="user_name" required class="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
              </div>

              <div id="register-message" class="text-red-500 text-sm text-center mb-4 min-h-[20px]"></div>

              <button type="submit" class="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors duration-200">회원가입</button>
          </form>
          <div class="mt-4 text-center text-sm">
              이미 계정이 있으신가요? <a href="#" onclick="changeScreen('login')" class="text-indigo-600 font-medium hover:underline">로그인</a>
          </div>
      </div>
  `;
}

function getLoginRequiredModal() {
    return `
      <div class="bg-white p-6 rounded-xl shadow-2xl w-full max-w-xs text-center">
          <div class="text-red-500 mb-4">
              <svg class="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <h3 class="text-lg font-bold mb-2">로그인 필수</h3>
          <p class="text-sm text-gray-600 mb-4">저장된 리뷰는 로그인한 사용자만 접근할 수 있습니다.</p>
          <button onclick="closeModal(); changeScreen('login');" class="bg-indigo-600 text-white p-2 rounded-lg font-semibold w-full hover:bg-indigo-700 transition-colors">로그인 하러 가기</button>
      </div>
  `;
}
function getDeleteAccountConfirmModal() {
    return `
      <div class="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm text-center">
          <div class="text-red-500 mb-4">
              <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
          </div>
          <h3 class="text-lg font-bold mb-2 text-gray-900">계정 삭제</h3>
          <p class="text-sm text-gray-600 mb-6">
              정말로 계정을 삭제하시겠습니까?<br>
              <span class="text-red-500 font-medium">저장된 모든 리뷰 데이터가 영구적으로 삭제됩니다.</span>
          </p>
          <div class="flex gap-3 justify-center">
              <button onclick="processDeleteAccount()" class="flex-1 bg-red-500 text-white p-3 rounded-lg font-semibold hover:bg-red-600 transition-colors shadow-md">
                  삭제하기
              </button>
              <button onclick="closeModal()" class="flex-1 bg-gray-200 text-gray-700 p-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors">
                  취소
              </button>
          </div>
      </div>
  `;
}

function getMessageModal(title, message) {
    return `
      <div class="bg-white p-6 rounded-xl shadow-2xl w-full max-w-xs text-center">
          <h3 class="text-lg font-bold mb-2">${title}</h3>
          <p class="text-sm text-gray-600 mb-4">${message}</p>
          <button onclick="closeModal()" class="bg-indigo-600 text-white p-2 rounded-lg font-semibold w-full hover:bg-indigo-700 transition-colors">확인</button>
      </div>
  `;
}

// AI 분석 결과 카드 HTML 
function getAnalysisCard(dbResult) {
    const isCurrentAnalysis = STATE.currentScreen === 'currentAnalysis';

    let analysisData;
    try {
        analysisData = (typeof dbResult.analysis_text === 'string')
            ? JSON.parse(dbResult.analysis_text)
            : dbResult.analysis_text;
    } catch (e) {
        console.error("AI 분석 결과(analysis_text) 파싱 오류:", e, dbResult.analysis_text);
        // 파싱 실패 시, 화면이 깨지지 않도록 기본 구조를 제공합니다.
        analysisData = {
            product_name: "데이터 오류",
            overall_sentiment_summary: "분석 결과를 해석할 수 없습니다. 저장된 데이터 형식을 확인해주세요.",
            keywords_analysis: []
        };
    }

    // 1. 전체 리뷰 분석 섹션 HTML 생성
    // keywords_analysis가 없거나 배열이 아니면 0으로 처리 (오류 방지)
    const keywordsAnalysis = Array.isArray(analysisData.keywords_analysis) ? analysisData.keywords_analysis : [];
    const totalPositive = keywordsAnalysis.reduce((sum, k) => sum + k.positive_count, 0);
    const totalNegative = keywordsAnalysis.reduce((sum, k) => sum + k.negative_count, 0);
    const totalReviewCount = totalPositive + totalNegative;
    const neutralCount = Math.round(totalReviewCount * 0.2); // 중립

    // 전체 비율 계산 (나누기 0 방지)
    // const positivePercentage = totalReviewCount > 0 ? Math.round((totalPositive / totalReviewCount) * 100) : 0; // 사용 안 함


    const overallAnalysisHtml = `
        <div class="bg-white p-6 rounded-xl shadow-lg w-full max-w-4xl mx-auto mt-4 border border-gray-200">
            <h2 class="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">📝 감정 분석</h2>
            <div class="flex space-x-4 mb-6 text-center">
                <div class="flex-1 p-4 rounded-lg bg-green-50"><div class="text-2xl font-extrabold text-green-700">${totalPositive}</div><div class="text-sm font-medium text-green-600">긍정적 리뷰</div></div>
                
                <div class="flex-1 p-4 rounded-lg bg-red-50"><div class="text-2xl font-extrabold text-red-700">${totalNegative}</div><div class="text-sm font-medium text-red-600">부정적 리뷰</div></div>
            </div>
            <div class="p-4 bg-indigo-50 rounded-lg">
                <h3 class="text-lg font-semibold text-indigo-800 mb-2">⭐ 전반적 감정 요약</h3>
                <p class="text-sm text-indigo-700">${analysisData.overall_sentiment_summary || '요약 정보가 없습니다.'}</p>
            </div>
        </div>
    `;

    const keywordsAnalysisHtml = keywordsAnalysis.map(k => {
        const positiveCount = k.positive_count || 0;
        const negativeCount = k.negative_count || 0;
        const keywordTotal = positiveCount + negativeCount;
        const positiveKeywordPercentage = keywordTotal > 0 ? Math.round((positiveCount / keywordTotal) * 100) : 0;
        const negativeKeywordPercentage = 100 - positiveKeywordPercentage;

        return `
            <div class="mb-8 p-6 bg-white rounded-xl shadow-md border border-gray-100">
                <h3 class="text-xl font-bold text-gray-900 mb-4">#${k.keyword}</h3>
                <div class="flex items-center space-x-4 mb-4">
                    <div class="w-1/3 text-right text-sm font-semibold text-green-700">${positiveCount}</div>
                    <div class="flex-1 h-3 rounded-full overflow-hidden bg-red-100"><div class="bg-green-500 h-3" style="width: ${positiveKeywordPercentage}%;"></div></div>
                    <div class="w-1/3 text-left text-sm font-semibold text-red-700">${negativeCount}</div>
                </div>
                <div class="flex justify-between text-xs font-medium text-gray-600 mb-6">
                    <span>긍정 (${positiveKeywordPercentage}%)</span><span>부정 (${negativeKeywordPercentage}%)</span>
                </div>
                <div class="bg-green-50 p-4 rounded-lg mb-4 border border-green-200">
                    <div class="flex items-center text-green-700 font-bold mb-2"><svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>긍정 리뷰 요약</div>
                    <p class="text-sm text-green-800">${k.positive_summary}</p>
                </div>
                <div class="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div class="flex items-center text-red-700 font-bold mb-2"><svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>부정 리뷰 요약</div>
                    <p class="text-sm text-red-800">${k.negative_summary}</p>
                </div>
            </div>
        `;
    }).join('');

    // 저장된 데이터에서 유사 상품 링크 추출 (라이브러리에서 불러올 때)
    const savedRelatedProducts = analysisData.related_products || null;
    
    // 유사 상품 추천 섹션 HTML 생성
    let relatedProductsHtml = '';
    
    if (isCurrentAnalysis) {
        // 현재 분석 중인 경우
        if (STATE.recommendChoice === null) {
            // 유사 상품 추천을 아직 선택하지 않은 경우 예/아니오 버튼 표시
            relatedProductsHtml = `
                <div class="mt-8 pt-6 border-t bg-white p-6 rounded-lg shadow-md">
                    <h3 class="text-lg font-bold text-gray-900 mb-4">💡 유사 상품 추천</h3>
                    <p class="text-sm text-gray-600 mb-4">이 제품과 유사한 상품을 추천받으시겠습니까?</p>
                    <div class="flex gap-3 justify-center">
                        <button onclick="handleRecommendProducts()" class="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors duration-200 shadow-md">
                            예
                        </button>
                        <button onclick="skipRecommendProducts()" class="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors duration-200">
                            아니오
                        </button>
                    </div>
                </div>
            `;
        } else if (STATE.recommendChoice === 'yes') {
            // 예를 선택한 경우
            if (STATE.relatedProducts && STATE.relatedProducts.length > 0) {
                // 유사 상품 링크가 있는 경우 표시
                const productsList = STATE.relatedProducts.map((link, index) => `
                    <div class="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                        <div class="flex items-center justify-between">
                            <div class="flex-1">
                                <div class="text-sm font-semibold text-gray-700 mb-1">유사 상품 ${index + 1}</div>
                                <a href="${link}" target="_blank" class="text-sm text-indigo-600 hover:text-indigo-800 hover:underline break-all">
                                    ${link}
                                </a>
                            </div>
                            <a href="${link}" target="_blank" class="ml-4 px-3 py-1 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors">
                                열기
                            </a>
                        </div>
                    </div>
                `).join('');
                
                relatedProductsHtml = `
                    <div class="mt-8 pt-6 border-t bg-white p-6 rounded-lg shadow-md">
                        <h3 class="text-lg font-bold text-gray-900 mb-4">💡 추천 유사 상품</h3>
                        <div class="space-y-3">
                            ${productsList}
                        </div>
                    </div>
                `;
            } else if (STATE.relatedProducts && STATE.relatedProducts.length === 0) {
                // 유사 상품을 찾지 못한 경우
                relatedProductsHtml = `
                    <div class="mt-8 pt-6 border-t bg-white p-6 rounded-lg shadow-md">
                        <h3 class="text-lg font-bold text-gray-900 mb-4">💡 유사 상품 추천</h3>
                        <p class="text-sm text-gray-500">유사 상품을 찾지 못했습니다.</p>
                    </div>
                `;
            }
            // relatedProducts가 null인 경우 (아직 수집 중)는 아무것도 표시하지 않음
        }
        // STATE.recommendChoice === 'no'인 경우는 아무것도 표시하지 않음
    } else {
        // 라이브러리에서 불러온 경우: 저장된 유사 상품 링크 표시
        if (savedRelatedProducts && Array.isArray(savedRelatedProducts) && savedRelatedProducts.length > 0) {
            const productsList = savedRelatedProducts.map((link, index) => `
                <div class="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <div class="text-sm font-semibold text-gray-700 mb-1">유사 상품 ${index + 1}</div>
                            <a href="${link}" target="_blank" class="text-sm text-indigo-600 hover:text-indigo-800 hover:underline break-all">
                                ${link}
                            </a>
                        </div>
                        <a href="${link}" target="_blank" class="ml-4 px-3 py-1 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors">
                            열기
                        </a>
                    </div>
                </div>
            `).join('');
            
            relatedProductsHtml = `
                <div class="mt-8 pt-6 border-t bg-white p-6 rounded-lg shadow-md">
                    <h3 class="text-lg font-bold text-gray-900 mb-4">💡 추천 유사 상품</h3>
                    <div class="space-y-3">
                        ${productsList}
                    </div>
                </div>
            `;
        }
    }

    return `
        <div class="flex flex-col w-full max-w-4xl mx-auto">
            <div class="text-center mb-6">
                <h1 class="text-2xl font-extrabold text-gray-800">${analysisData.product_name || '제품 분석 결과'}</h1>
                ${dbResult.demo_mode ? `<p class="mt-2 text-xs font-medium text-amber-700">식별 정보를 제거한 사전 수집 리뷰 ${dbResult.demo_review_count || ''}건을 사용하는 Demo Mode입니다.</p>` : ''}
            </div>
            ${overallAnalysisHtml}
            <div class="mt-8">
                <h2 class="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">🔍 키워드별 상세 분석</h2>
                ${keywordsAnalysisHtml}
            </div>
            ${relatedProductsHtml}
            ${isCurrentAnalysis && STATE.recommendChoice !== null && (STATE.recommendChoice === 'no' || (STATE.recommendChoice === 'yes' && STATE.relatedProducts !== null)) ?
            `<div class="mt-8 pt-6 border-t text-center sticky bottom-0 bg-white p-4 shadow-xl rounded-lg">
                    <button onclick="handleSaveAnalysis()" class="flex items-center justify-center w-full max-w-md mx-auto bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors duration-200 shadow-md">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4L12 7l-4 4m0 0l4 4m-4-4h8"></path></svg>
                        결과 저장하기
                    </button>
                </div>`
            : ''}
        </div>
    `;
}

// --- 화면별 렌더링 함수 ---

// 채팅 영역 렌더링
function renderChatArea() {
    const chatArea = document.getElementById('chat-area');
    if (!chatArea) return;

    chatArea.innerHTML = STATE.chatHistory.map(msg => {
        if (msg.role === 'user') {
            if (msg.type === 'keyword') {
                const keywords = msg.content.split(',').map(k => k.trim());

                const tagsHtml = keywords.map(k =>
                    `<span class="inline-block bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md">${k}</span>`
                ).join('');

                return `
                    <div class="flex items-start justify-end mb-6">
                        <div class="max-w-3xl flex flex-wrap gap-2 justify-end">
                            ${tagsHtml}
                        </div>
                        <div class="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm ml-4">U</div>
                    </div>
                `;
            }
            // 2) 일반 텍스트/URL일 경우: 기존 말풍선 유지
            else {
                return `
                    <div class="flex items-start justify-end mb-6">
                        <div class="max-w-3xl">
                            <div class="bg-indigo-600 text-white p-4 rounded-xl shadow-md">
                                <p class="text-sm break-all">${msg.content}</p>
                            </div>
                        </div>
                        <div class="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm ml-4">U</div>
                    </div>
                `;
            }
        } else if (msg.content === '__ANALYSIS_RESULT_CARD__') {
            return getAnalysisCard(STATE.analysisResult);
        } else {
            // 시스템 메시지
            let contentHtml = '';
            if (msg.content === '__ANALYSIS_RESULT_CARD__') {
                // 분석 결과가 있을 때만 카드 렌더링 (안전을 위한 추가 확인)
                contentHtml = STATE.analysisResult ? getAnalysisCard(STATE.analysisResult) : '<p>분석 결과를 불러오는 데 실패했습니다.</p>';
            } else if (msg.content.includes('🚫')) {
                // 오류 메시지
                contentHtml = `<p class="text-red-600 font-medium">${msg.content}</p>`;
            } else {
                // 일반 시스템 메시지 (크롤링 시작, 키워드 요청 등)
                contentHtml = `<p>${msg.content}</p>`;
            }
            return `
              <div class="flex items-start mb-6">
                  <div class="flex-shrink-0 w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-sm mr-4">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 10v2m14-2v2M5 10h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-3"></path></svg>
                  </div>
                  <div class="max-w-3xl">
                      <div class="bg-white p-4 rounded-xl shadow-md border border-gray-100">
                          ${contentHtml}
                      </div>
                  </div>
              </div>
          `;
        }
    }).join('');

    chatArea.scrollTop = chatArea.scrollHeight;
}

// 채팅 제출 핸들러
async function handleChatSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const value = input.value.trim();
    input.value = '';

    if (!value) return;

    // 1. URL 입력 단계
    if (STATE.chatHistory.length === 0) {
        const urlRegex = /^(https?:\/\/[^\s]+)$/i;
        if (!urlRegex.test(value)) {
            pushChat('system', '유효한 쇼핑몰 링크(URL)를 입력해주세요.');
            return;
        }

        STATE.tempUrl = value;
        pushChat('user', `${value}`, 'text');
        pushChat('system', `URL을 확인했습니다. 어떤 키워드로 분석을 진행할까요? (예: 키워드: 배터리, 카메라)`);

        // 2. 키워드 입력 단계
    } else if (STATE.chatHistory.length > 0 && STATE.tempUrl) {
        let keywordValue = value;

        if (value.toLowerCase().startsWith('키워드:')) {
            keywordValue = value.substring('키워드:'.length).trim();
        }
        console.log('사용자가 입력한 값:', keywordValue);
        if (!keywordValue) {
            pushChat('system', '분석할 키워드를 쉼표로 구분하여 입력해주세요.');
            return;
        }

        pushChat('user', keywordValue, 'keyword');
        await runAnalysis(STATE.tempUrl, keywordValue);
        delete STATE.tempUrl;

        // 3. 분석 완료 후
    } else {
        pushChat('system', '새로운 분석을 시작하려면 왼쪽 사이드바의 "새 분석 시작"을 클릭해주세요.');
    }
}

// 현재 분석 화면 렌더링
function renderCurrentAnalysis() {
    elements.contentContainer.innerHTML = `
      <div class="flex flex-col h-[calc(100vh-64px)]">
          <div id="chat-area" class="flex-1 overflow-y-auto p-4 hide-scrollbar pt-0">
              ${STATE.chatHistory.length === 0 ? `
                  <div class="flex items-start mb-6 pt-8">
                      <div class="flex-shrink-0 w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-sm mr-4">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 10v2m14-2v2M5 10h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-3"></path></svg>
                      </div>
                      <div class="max-w-3xl">
                          <div class="bg-white p-4 rounded-xl shadow-md border border-gray-100">
                              <p>안녕하세요! 쇼핑몰 링크(URL)를 입력하시면 리뷰 분석을 시작할 수 있습니다.</p>
                          </div>
                      </div>
                  </div>
              ` : ''}
          </div>

          <div id="input-container" class="sticky bottom-0 bg-white p-4 border-t border-gray-200">
              <form id="chat-form" class="flex" onsubmit="handleChatSubmit(event)">
                  <input type="text" id="chat-input" placeholder="쇼핑몰 링크 또는 키워드를 입력하세요..." required
                      class="flex-1 p-4 border border-gray-300 rounded-l-xl focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow shadow-inner">
                  <button type="submit" class="bg-indigo-600 text-white p-4 rounded-r-xl font-semibold hover:bg-indigo-700 transition-colors duration-200 flex items-center justify-center">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                  </button>
              </form>
              <p class="text-xs text-gray-500 mt-2 text-center">
                  예시: https://example.com/product/123 또는 키워드: 배터리, 카메라
              </p>
          </div>
      </div>
  `;
    // 채팅 기록이 있다면 다시 렌더링
    if (STATE.chatHistory.length > 0) {
        renderChatArea();
    }
}

// 저장된 리뷰 화면 렌더링
function renderSavedReviews() {
    if (!STATE.isAuthenticated) return;

    // STATE.savedData는 이제 DB의 ANALYSES 테이블 구조를 따르는 객체들의 배열입니다.
    const savedReviewsHtml = STATE.savedData.length > 0 ?
        STATE.savedData.map(item => {
            let analysisData;
            let keywordTags = '';
            try {
                // 각 item의 analysis_text를 파싱하여 제품 이름 등을 가져옵니다.
                analysisData = JSON.parse(item.analysis_text);

                // keywords_analysis 배열에서 모든 키워드를 태그로 변환
                const keywordsAnalysis = Array.isArray(analysisData.keywords_analysis) ? analysisData.keywords_analysis : [];

                if (keywordsAnalysis.length > 0) {
                    keywordTags = keywordsAnalysis
                        .map(k => k.keyword.trim()) // 각 키워드 객체에서 'keyword' 이름만 추출
                        .filter(k => k.length > 0)
                        .map(k => `<span class="inline-block bg-indigo-100 text-indigo-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full">${k}</span>`)
                        .join('');
                } else {
                    keywordTags = '<span class="text-gray-500">분석 키워드 없음</span>';
                }
            } catch (e) {
                analysisData = { product_name: "데이터 파싱 오류", keywords_analysis: [] };
            }

            return `
            <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-6 relative">
                <div class="flex justify-between items-center mb-4 pb-4 border-b">
                    <h3 class="text-lg font-bold text-gray-900">${analysisData.product_name || "제품명 없음"}</h3>
                    <div class="text-sm text-gray-500">${new Date(item.analyzed_at).toLocaleDateString('ko-KR')}</div>
                </div>

                <div class="text-sm font-medium text-gray-600 mb-4 flex flex-wrap items-start">
                    <span class="mr-2 flex-shrink-0">분석 키워드:</span>
                    <div class="flex flex-wrap mt-[-2px]">${keywordTags}</div>
                </div>

                <p class="text-sm font-medium text-gray-600 mb-4">
                  분석된 URL: <a href="${item.url}" target="_blank" class="text-indigo-600 hover:underline truncate block">${item.url}</a>
                </p>

                <div class="flex justify-end space-x-2 border-t pt-4">
                    <button onclick="viewSavedReviewDetails('${item.analysis_id}')" class="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors">
                        상세 보기
                    </button>
                    <button onclick="handleDeleteReview('${item.analysis_id}')" class="px-3 py-1 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                        삭제
                    </button>
                </div>
            </div>
          `;
        }).join('')
        : '<div class="text-center py-12 text-gray-500">아직 저장된 리뷰가 없습니다. 분석 결과를 저장해보세요!</div>';

    elements.contentContainer.innerHTML = `
        <h1 class="text-2xl font-bold text-gray-900 mb-6">내 라이브러리</h1>
        <div class="max-w-3xl mx-auto">
            ${savedReviewsHtml}
        </div>
    `;
}

function viewSavedReviewDetails(analysisId) {
    // STATE.savedData 배열에서 해당 analysis_id를 가진 항목을 찾습니다.
    const reviewItem = STATE.savedData.find(item => item.analysis_id === analysisId);

    if (reviewItem) {
        // '저장하기' 버튼이 없는 상세 카드를 렌더링하기 위해 임시로 화면 상태 변경
        const originalScreen = STATE.currentScreen;
        STATE.currentScreen = 'savedReviewsDetail'; // '저장하기' 버튼 숨김 조건

        // getAnalysisCard 함수를 재활용하여 상세 내용을 HTML로 생성
        const cardHtml = getAnalysisCard(reviewItem);

        showModal(`
            <div class="bg-gray-50 p-4 sm:p-6 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto hide-scrollbar">
                <div class="flex justify-between items-center mb-4 border-b pb-3 bg-gray-50 sticky top-0">
                    <h2 class="text-xl font-bold">저장된 분석 상세</h2>
                    <button onclick="closeModalAndRestoreScreen('${originalScreen}')" class="text-gray-500 hover:text-gray-800 transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                ${cardHtml}
                <div class="mt-4 text-center">
                   <button onclick="closeModalAndRestoreScreen('${originalScreen}')" class="mt-4 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors">닫기</button>
                </div>
            </div>
        `);
    } else {
        showModal(getMessageModal('오류', '상세 정보를 불러올 수 없습니다.'));
    }
}

function closeModalAndRestoreScreen(originalScreen) {
    closeModal();
    STATE.currentScreen = originalScreen;
}

// 설정 화면 렌더링
function renderSettings() {
    elements.contentContainer.innerHTML = `
      <h1 class="text-2xl font-bold text-gray-900 mb-6">설정</h1>
      <div class="bg-white p-8 rounded-xl shadow-lg max-w-2xl">
          <p class="text-lg font-semibold mb-4">계정 정보</p>
          <div class="space-y-3">
              <div class="flex justify-between border-b pb-2">
                  <span class="text-gray-600">아이디:</span>
                  <span class="font-medium text-gray-900">${STATE.user.user_name || '비로그인'}</span>
              </div>
              <div class="flex justify-between border-b pb-2">
                  <span class="text-gray-600">구독 플랜:</span>
                  <span class="font-medium text-green-600">Free Plan</span>
              </div>
          </div>
          
          <button onclick="handleDeleteAccount()" class="mt-6 px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors">
              계정 삭제
          </button>
      </div>
  `;
}

// 메인 렌더링 함수
function renderContent() {
    // 로그인, 회원가입 화면은 메인 콘텐츠 영역에 풀 사이즈로 표시
    elements.modalContainer.classList.add('hidden');
    elements.modalContainer.innerHTML = '';

    switch (STATE.currentScreen) {
        case 'login':
            elements.contentContainer.innerHTML = `<div class="flex items-center justify-center min-h-[calc(100vh-32px)]">${getLoginForm()}</div>`;
            break;
        case 'register':
            elements.contentContainer.innerHTML = `<div class="flex items-center justify-center min-h-[calc(100vh-32px)]">${getRegisterForm()}</div>`;
            break;
        case 'savedReviews':
            renderSavedReviews();
            break;
        case 'settings':
            renderSettings();
            break;
        case 'main':
        case 'currentAnalysis':
        default:
            renderCurrentAnalysis();
            break;
    }
}

document.addEventListener('DOMContentLoaded', initialize);
