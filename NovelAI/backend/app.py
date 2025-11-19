import os
import google.generativeai as genai
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from flask_cors import CORS
import traceback # 오류의 상세 내용을 출력하기 위해 추가

# .env 파일에서 환경 변수 로드
load_dotenv()

# --- Gemini API 설정 ---
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.")

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-2.0-flash')


# --- Flask 웹 서버 설정 ---
app = Flask(__name__)
CORS(app) 

# --- ★ 수정된 부분 1: Gemini 안전 설정 해제 ---
# Gemini의 콘텐츠 안전 필터를 비활성화합니다.
# (소설 원고의 폭력성, 선정성 등으로 인해 차단되는 것을 방지)
safety_settings = [
    {
        "category": "HARM_CATEGORY_HARASSMENT",
        "threshold": "BLOCK_NONE"
    },
    {
        "category": "HARM_CATEGORY_HATE_SPEECH",
        "threshold": "BLOCK_NONE"
    },
    {
        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "threshold": "BLOCK_NONE"
    },
    {
        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
        "threshold": "BLOCK_NONE"
    },
]

@app.route('/analyze', methods=['POST'])
def analyze_manuscript():
    data = request.json
    manuscript = data.get('manuscript')
    analysis_type = data.get('analysis_type')
    user_question = data.get('user_question', '') 

    if not manuscript or not analysis_type:
        return jsonify({"error": "원고와 분석 유형이 필요합니다."}), 400

    prompt = ""
    # (프롬프트 설정 부분은 이전과 동일합니다)
    if analysis_type == 'consistency':
        prompt = f"""
        당신은 매우 꼼꼼한 소설 편집자입니다. 
        아래 원고를 분석하여 캐릭터, 세계관 설정, 시간 흐름 등에서 나타나는 '불일치' 또는 '모순점'을 모두 찾아 리포트 형식으로 정리해주세요.
        각 항목은 어떤 챕터에서 발견되었는지 명시하고, 왜 문제가 되는지 간결하게 설명해주세요.
        
        [원고 시작]
        {manuscript}
        [원고 끝]
        """
    elif analysis_type == 'structure':
        prompt = f"""
        당신은 전문적인 스토리 분석가입니다.
        아래 원고의 전체적인 플롯 구조를 분석해주세요. 각 챕터별 주요 사건을 한 문장으로 요약하고, 
        그 사건이 이야기의 긴장감, 개연성, 서사 흐름에 어떤 영향을 미치는지 강점과 약점을 나누어 평가해주세요.

        [원고 시작]
        {manuscript}
        [원고 끝]
        """
    elif analysis_type == 'question':
        prompt = f"""
        당신은 작가에게 구체적이고 건설적인 피드백을 제공하는 전문 소설 편집자입니다.
        먼저 아래 원고의 전체적인 맥락을 파악한 후, 이어지는 작가의 질문에 대해 명확하고 논리적으로 답변해주세요. 
        불필요한 칭찬은 최소화하고, 문제점과 개선 방안을 중심으로 답변해주세요.
        
        [원고 시작]
        {manuscript}
        [원고 끝]

        [작가의 질문]
        {user_question}
        """
    else:
        return jsonify({"error": "알 수 없는 분석 유형입니다."}), 400
        
    # --- ★ 수정된 부분 2: 오류 추적 강화 및 안전 설정 적용 ---
    try:
        # Gemini API 호출 시 safety_settings 적용
        response = model.generate_content(prompt, safety_settings=safety_settings)
        
        return jsonify({"analysis_result": response.text})

    except Exception as e:
        # 오류 발생 시 터미널에 상세한 오류 내용(Traceback)을 강제로 출력
        print("---!!! DETAILED ERROR TRACEBACK !!!---")
        traceback.print_exc()
        print("--------------------------------------")
        
        # HTML 페이지에도 구체적인 오류 메시지 전송
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500


# 서버 실행
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)