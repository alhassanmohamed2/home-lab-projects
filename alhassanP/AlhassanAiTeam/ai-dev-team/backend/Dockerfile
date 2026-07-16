FROM python:3.9

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY ./app /code/app

# Copy the gemini executable from the build context to the container
COPY gemini /usr/local/bin/gemini
RUN chmod +x /usr/local/bin/gemini

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
