import React from 'react';

export default function Privacy() {
  return (
    <div className="policy-page">
      <div className="policy-container">
        <h1>개인정보처리방침</h1>
        <p className="policy-date">시행일: 2025년 1월 1일</p>

        <p>
          알림앤울림(이하 "회사")은 ProPath 서비스(이하 "서비스") 이용자의 개인정보를 중요하게 여기며,
          「개인정보 보호법」 및 관련 법령을 준수합니다.
        </p>

        <section>
          <h2>1. 수집하는 개인정보 항목</h2>
          <ul>
            <li><strong>필수:</strong> 이메일 주소, 비밀번호, 이름, 회원 유형(커리어 가이드/커리어 러너/파트너 기업)</li>
            <li><strong>선택:</strong> 연락처, 분야/직무, 현직 기업명, 경력 연차, 프로필 사진, 이력서, 한줄 소개</li>
            <li><strong>자동 수집:</strong> 서비스 이용 기록, 접속 IP, 쿠키</li>
          </ul>
        </section>

        <section>
          <h2>2. 개인정보 수집·이용 목적</h2>
          <ul>
            <li>회원 가입 및 본인 확인</li>
            <li>커리어 컨설팅 매칭 서비스 제공</li>
            <li>커리어 리포트 작성 및 파트너 기업 추천</li>
            <li>이메일 인증 및 서비스 안내 발송</li>
            <li>불법·부정 이용 방지 및 서비스 개선</li>
          </ul>
        </section>

        <section>
          <h2>3. 개인정보 보유 및 이용 기간</h2>
          <p>회원 탈퇴 시 즉시 파기합니다. 단, 관련 법령에 따라 아래 정보는 일정 기간 보관합니다.</p>
          <ul>
            <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
            <li>소비자 불만 또는 분쟁처리 기록: 3년 (전자상거래법)</li>
            <li>접속 로그 기록: 3개월 (통신비밀보호법)</li>
          </ul>
        </section>

        <section>
          <h2>4. 개인정보 제3자 제공</h2>
          <p>
            회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
            단, 파트너 기업 추천을 이용자가 직접 신청한 경우, 해당 파트너 기업에 이름·분야·커리어 리포트 정보가 제공됩니다.
          </p>
        </section>

        <section>
          <h2>5. 개인정보 처리 위탁</h2>
          <ul>
            <li>이메일 발송: Resend (미국, 이메일 인증 및 알림 발송 목적)</li>
            <li>서버 호스팅: Railway / Render (서비스 운영 목적)</li>
          </ul>
        </section>

        <section>
          <h2>6. 이용자의 권리</h2>
          <p>이용자는 언제든지 개인정보 열람, 수정, 삭제, 처리 정지를 요청할 수 있습니다.</p>
          <ul>
            <li>마이페이지에서 직접 수정 및 탈퇴 가능</li>
            <li>이메일 문의: <a href="mailto:faithor@naver.com">faithor@naver.com</a></li>
          </ul>
        </section>

        <section>
          <h2>7. 쿠키 사용</h2>
          <p>서비스는 로그인 상태 유지를 위해 로컬스토리지(LocalStorage)를 사용합니다. 브라우저 설정에서 삭제 가능합니다.</p>
        </section>

        <section>
          <h2>8. 개인정보 보호책임자</h2>
          <ul>
            <li>성명: 김호덕</li>
            <li>이메일: <a href="mailto:faithor@naver.com">faithor@naver.com</a></li>
          </ul>
        </section>

        <section>
          <h2>9. 개인정보처리방침 변경</h2>
          <p>본 방침은 법령 또는 서비스 변경에 따라 개정될 수 있으며, 변경 시 서비스 내 공지사항을 통해 안내합니다.</p>
        </section>

        <p className="policy-footer-note">
          알림앤울림(Alim&amp;Ulim) · 서울특별시 관악구 은천로 110 WS타워 806호 · faithor@naver.com
        </p>
      </div>
    </div>
  );
}
