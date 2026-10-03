# RA/review_analyzer/ai/chatbot.py

from google import genai
from flask import current_app

class ChatBot:
    def __init__(self, model, system_message="You are a helpful assistant."):
        self.model_name = model
        self.system_message = system_message
        self.client = None
        self.is_initialized = False

    def init_app(self, app):
        """ Flask 앱 컨텍스트 안에서 API 키로 모델을 초기화합니다. """
        with app.app_context():
            try:
                api_key = current_app.config['GOOGLE_API_KEY']
                self.client = genai.Client(api_key=api_key)
                self.is_initialized = True
            except KeyError:
                raise ValueError("config.py에 GOOGLE_API_KEY가 설정되지 않았습니다.")
            except Exception as e:
                raise RuntimeError(f"Google Generative AI 설정 중 오류 발생: {e}")

    def get_response(self, user_input):
        """ 사용자 입력을 모델에 보내고, 텍스트 응답을 반환합니다. """
        if not self.is_initialized:
            raise RuntimeError("ChatBot이 초기화되지 않았습니다. init_app()을 먼저 호출해야 합니다.")
        response = self.client.interactions.create(
            model=self.model_name,
            system_instruction=self.system_message,
            input=user_input,
        )
        return response.output_text

    def reset(self):
        """ 각 분석은 독립적인 단일 요청으로 처리됩니다. """
        return None
