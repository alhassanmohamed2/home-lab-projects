
ar_lines = []
eng_lines = []
arabic_english = {}
arabic_file = input("Enter your Arabic File Name: ")
English_file = input("Enter your English File Name: ")


with open(f"{arabic_file}") as Arabic_file:
    ar_lines = Arabic_file.read()
ar_lines_result = ar_lines.split(".")
ar_lines_result = [s.replace("\n\n", "") for s in ar_lines_result]


with open(f"{English_file}") as English_file:
    eng_lines = English_file.read()
eng_lines_result = eng_lines.split(".")
eng_lines_result = [s.replace("\n", "") for s in eng_lines_result]


for i in range(len(eng_lines_result)):
    arabic_english[i] = [ar_lines_result[i],eng_lines_result[i]]


with open("a_e_file.txt","w") as A_E_File:
    for A_E in arabic_english:
        for i in arabic_english[A_E]:
             A_E_File.write( i + "\n")